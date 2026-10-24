"""Run the gold set against a live NOVA (`/api/chat`) and score the replies.

    NOVA_LIVE_TESTS=1 python -m evals.runner --base-url https://www.aldrian-a.dev
    python -m evals.runner --dry-run                       # validate the gold set, no calls
    python -m evals.runner --rescore evals/reports/X.json  # re-score saved replies, no calls

Every case is one real model call against a key shared by every visitor, which
CloudIQ caps at 10 requests/minute and 200/day, and the route adds its own
6/minute per-IP limit. So this refuses to make calls unless `NOVA_LIVE_TESTS=1`
(the same switch the live pytest cases use), spaces requests out by default,
and waits out a 429 instead of failing the case.

`--rescore` exists so that changing a scorer does not cost more calls: the saved
reports hold every reply, so a scorer fix can be checked against real output for
free. Several reports can be given and are combined.

Exit status: 0 healthy, 1 a quality gate failed, 2 bad setup.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import time
from pathlib import Path

import httpx

from evals.dataset import (
    EVALS_DIR,
    GOLDEN_PATH,
    load_dataset,
    source_text,
    valid_section_ids,
    validate_dataset,
)
from evals.scorers import CaseScore, ascii_safe, score_case, summarize

DEFAULT_BASE_URL = os.environ.get("NEXT_API_BASE_URL", "http://localhost:3002")
# 12s between calls is 5/minute: under the route's 6/minute per-IP limit and
# CloudIQ's 10/minute key limit, with headroom for a retry.
DEFAULT_DELAY_S = 12.0
REQUEST_TIMEOUT_S = 90.0
MAX_RATE_LIMIT_WAITS = 3
REPORTS_DIR = EVALS_DIR / "reports"

# More than this share of runs erroring means the run says nothing about NOVA.
MAX_ERROR_SHARE = 0.20


def ask(client: httpx.Client, base_url: str, case: dict) -> dict:
    """One /api/chat call. Returns the reply, or an `error` for infrastructure
    failures (rate limit that never cleared, gateway down, timeout) so they can
    be kept apart from the model giving a bad answer."""
    payload = {
        "messages": [{"role": "user", "content": case["question"]}],
        "mode": case.get("mode", "ask"),
    }
    rate_limit_waits = 0
    retried_transient = False

    while True:
        started = time.monotonic()
        try:
            response = client.post(f"{base_url}/api/chat", json=payload)
        except httpx.HTTPError as error:
            if not retried_transient:
                retried_transient = True
                time.sleep(5)
                continue
            return {"error": f"request failed: {error!r}", "latency_s": time.monotonic() - started}
        latency = time.monotonic() - started

        if response.status_code == 429 and rate_limit_waits < MAX_RATE_LIMIT_WAITS:
            rate_limit_waits += 1
            time.sleep(float(response.headers.get("Retry-After", "15")) + 1)
            continue
        if response.status_code >= 500 and not retried_transient:
            retried_transient = True
            time.sleep(5)
            continue

        if response.status_code != 200:
            try:
                detail = response.json().get("error", "")
            except ValueError:
                detail = response.text[:120]
            return {"error": f"HTTP {response.status_code}: {detail}", "latency_s": latency}

        body = response.json()
        return {
            "reply": body.get("reply", ""),
            "navigate": body.get("navigate"),
            "servedModel": body.get("servedModel"),
            "latency_s": latency,
        }


def select_cases(dataset: dict, only: list[str] | None, ids: list[str] | None, limit: int | None) -> list[dict]:
    cases = dataset["cases"]
    if only:
        cases = [c for c in cases if c["category"] in only]
    if ids:
        cases = [c for c in cases if c["id"] in ids]
    return cases[:limit] if limit else cases


def case_outcomes(scores: list[CaseScore]) -> dict[str, bool]:
    """A case passes only if every run of it passed."""
    outcome: dict[str, bool] = {}
    for score in scores:
        if score.errored:
            continue
        outcome[score.case_id] = outcome.get(score.case_id, True) and score.passed
    return outcome


def flaky_cases(scores: list[CaseScore]) -> list[str]:
    seen: dict[str, set[bool]] = {}
    for score in scores:
        if not score.errored:
            seen.setdefault(score.case_id, set()).add(score.passed)
    return sorted(case_id for case_id, results in seen.items() if len(results) > 1)


def compare_to_baseline(current: dict[str, bool], baseline_path: Path) -> tuple[list[str], list[str]]:
    previous = json.loads(baseline_path.read_text(encoding="utf-8")).get("cases", {})
    regressions = sorted(cid for cid, passed in current.items() if previous.get(cid) is True and not passed)
    fixed = sorted(cid for cid, passed in current.items() if previous.get(cid) is False and passed)
    return regressions, fixed


def rescore_reports(paths: list[Path], dataset: dict, sections: set[str]) -> list[CaseScore]:
    """Score the replies saved in earlier reports against the *current* scorers
    and gold set. Cases that have since left the gold set are skipped.

    Reports are applied in the order given, and a case that appears again in a
    later report replaces its earlier runs, so re-running a few cases and listing
    that report last updates just those, which is how a full baseline is
    assembled from partial runs."""
    cases = {case["id"]: case for case in dataset["cases"]}
    latest: dict[str, list[CaseScore]] = {}
    for path in paths:
        saved = json.loads(path.read_text(encoding="utf-8"))
        in_this_report: dict[str, list[CaseScore]] = {}
        for run in saved["runs"]:
            case = cases.get(run["id"])
            if case is None:
                print(f"skipping {run['id']}: no longer in the gold set")
                continue
            if run.get("errored"):
                response = {"error": run.get("error") or "errored", "latency_s": run.get("latency_s", 0.0)}
            else:
                response = {
                    "reply": run.get("reply", ""),
                    "navigate": run.get("navigate"),
                    "servedModel": run.get("served_model"),
                    "latency_s": run.get("latency_s", 0.0),
                }
            in_this_report.setdefault(run["id"], []).append(score_case(case, response, sections))
        latest.update(in_this_report)
    return [score for runs in latest.values() for score in runs]


def saved_base_urls(paths: list[Path]) -> set[str]:
    """Where the saved reports' replies were recorded from."""
    urls = {json.loads(path.read_text(encoding="utf-8")).get("base_url") for path in paths}
    return {url for url in urls if url}


def print_case(score: CaseScore, index: int, total: int) -> None:
    status = "ERR " if score.errored else ("PASS" if score.passed else "FAIL")
    model = f", {score.served_model}" if score.served_model else ""
    print(f"[{index:>2}/{total}] {status} {score.case_id}  ({score.latency_s:.1f}s{model})")
    if score.errored:
        print(f"        {ascii_safe(score.error)}")
    for check in score.checks:
        if not check.passed:
            print(f"        x {check.name}: {ascii_safe(check.detail)}")
    if not score.passed and not score.errored:
        print(f"        reply: {ascii_safe(score.reply[:220])!r}")


def print_summary(summary: dict, flaky: list[str]) -> None:
    rate = summary["pass_rate"]
    print()
    print("=" * 64)
    print(
        f"passed {summary['passed']}/{summary['scored']}"
        f"  ({'n/a' if rate is None else f'{rate:.0%}'})"
        f"   errored {summary['errored']}   mean words {summary['mean_words']}"
    )
    print(f"latency p50 {summary['latency_s']['p50']}s  p95 {summary['latency_s']['p95']}s")
    print("-" * 64)
    print(f"{'category':<16}{'passed':>8}{'total':>8}{'rate':>8}")
    for category, bucket in sorted(summary["by_category"].items()):
        print(f"{category:<16}{bucket['passed']:>8}{bucket['total']:>8}{bucket['rate']:>8.0%}")
    if len(summary["by_served_model"]) > 1 or "unknown" not in summary["by_served_model"]:
        print("-" * 64)
        print("by serving model (CloudIQ falls back between models):")
        for model, bucket in sorted(summary["by_served_model"].items()):
            print(f"  {model:<30}{bucket['passed']:>4}/{bucket['total']:<4}{bucket['rate']:>6.0%}")
    if summary["failed_checks"]:
        print("-" * 64)
        print("most-failed checks: " + ", ".join(f"{name} x{n}" for name, n in summary["failed_checks"].items()))
    if summary["warned"]:
        print(
            f"warnings (not failures): {summary['warned']}/{summary['scored']} replies "
            "used internal jargon ('dossier')"
        )
    if flaky:
        print("flaky (mixed results across repeats): " + ", ".join(flaky))
    print("=" * 64)


def finish(scores: list[CaseScore], args: argparse.Namespace, dataset: dict, write_report: bool) -> int:
    """Summarise, optionally persist, and apply the quality gates. Shared by live
    runs and `--rescore` so both are held to exactly the same bar."""
    summary = summarize(scores)
    flaky = flaky_cases(scores)
    print_summary(summary, flaky)

    outcomes = case_outcomes(scores)
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    if write_report:
        report_path = args.out or REPORTS_DIR / f"{stamp}.json"
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report = {
            "created": stamp,
            "base_url": args.base_url,
            "dataset_version": dataset.get("version"),
            "repeat": args.repeat,
            "summary": summary,
            "flaky": flaky,
            "runs": [
                {
                    "id": s.case_id,
                    "category": s.category,
                    "critical": s.critical,
                    "passed": s.passed,
                    "errored": s.errored,
                    "error": s.error,
                    "navigate": s.navigate,
                    "served_model": s.served_model,
                    "latency_s": round(s.latency_s, 2),
                    "words": s.words,
                    "reply": s.reply,
                    "warnings": s.warnings,
                    "failed_checks": [{"name": c.name, "detail": c.detail} for c in s.checks if not c.passed],
                }
                for s in scores
            ],
        }
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"full report: {report_path}")

    if args.save_baseline:
        args.save_baseline.parent.mkdir(parents=True, exist_ok=True)
        args.save_baseline.write_text(
            json.dumps(
                {
                    "created": stamp,
                    "base_url": args.base_url,
                    "dataset_version": dataset.get("version"),
                    "pass_rate": summary["pass_rate"],
                    "by_category": {k: v["rate"] for k, v in summary["by_category"].items()},
                    "cases": outcomes,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"baseline saved: {args.save_baseline}")

    failures: list[str] = []
    if summary["critical_failures"]:
        failures.append("critical case(s) failed: " + ", ".join(summary["critical_failures"]))
    if summary["pass_rate"] is not None and summary["pass_rate"] < args.min_pass:
        failures.append(f"pass rate {summary['pass_rate']:.0%} is below the {args.min_pass:.0%} gate")
    if summary["errored"] / max(1, summary["total"]) > MAX_ERROR_SHARE:
        failures.append(f"{summary['errored']}/{summary['total']} runs errored; the run is not representative")

    if args.baseline:
        regressions, fixed = compare_to_baseline(outcomes, args.baseline)
        if fixed:
            print("fixed since baseline: " + ", ".join(fixed))
        if regressions:
            print("REGRESSED since baseline: " + ", ".join(regressions))
            if args.fail_on_regression:
                failures.append("regressed since baseline: " + ", ".join(regressions))

    if failures:
        print("\nGATES FAILED")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print("\nall gates passed")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="server to test (default: %(default)s)")
    parser.add_argument("--dataset", type=Path, default=GOLDEN_PATH)
    parser.add_argument("--only", nargs="+", metavar="CATEGORY", help="run only these categories")
    parser.add_argument("--ids", nargs="+", metavar="ID", help="run only these case ids")
    parser.add_argument("--limit", type=int, help="run at most N cases (after filtering)")
    parser.add_argument("--repeat", type=int, default=1, help="runs per case; a case passes only if all pass")
    parser.add_argument("--delay", type=float, default=DEFAULT_DELAY_S, help="seconds between calls (default: %(default)s)")
    parser.add_argument("--min-pass", type=float, default=0.80, help="overall pass-rate gate (default: %(default)s)")
    parser.add_argument("--baseline", type=Path, help="summary.json from an earlier run to compare against")
    parser.add_argument("--fail-on-regression", action="store_true", help="exit 1 if a baseline-passing case now fails")
    parser.add_argument("--save-baseline", type=Path, help="write this run's per-case outcomes here")
    parser.add_argument("--out", type=Path, help="full report path (default: evals/reports/<timestamp>.json)")
    parser.add_argument("--dry-run", action="store_true", help="validate the gold set and show the plan; make no calls")
    parser.add_argument(
        "--rescore",
        nargs="+",
        type=Path,
        metavar="REPORT",
        help="re-score saved report(s) with the current scorers and gold set; makes no model calls",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    dataset = load_dataset(args.dataset)
    sections = valid_section_ids()
    problems = validate_dataset(dataset, sections, source_text())
    if problems:
        print("The gold set is not sound:", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 2

    if args.rescore:
        scores = rescore_reports(args.rescore, dataset, sections)
        if not scores:
            print("Nothing to rescore.", file=sys.stderr)
            return 2
        # The replies came from wherever they were recorded, not from the default
        # URL, so a baseline built here must say so.
        origins = saved_base_urls(args.rescore)
        if origins:
            args.base_url = ", ".join(sorted(origins))
        print(f"re-scoring {len(scores)} saved run(s); no model calls.")
        for index, score in enumerate(scores, start=1):
            print_case(score, index, len(scores))
        return finish(scores, args, dataset, write_report=args.out is not None)

    cases = select_cases(dataset, args.only, args.ids, args.limit)
    if not cases:
        print("No cases match those filters.", file=sys.stderr)
        return 2

    calls = len(cases) * args.repeat
    minutes = calls * args.delay / 60
    print(f"{calls} model call(s) against {args.base_url}, ~{minutes:.1f} min at {args.delay}s spacing.")
    if args.dry_run:
        for case in cases:
            print(f"  {case['category']:<13} {case['id']}")
        return 0

    if os.environ.get("NOVA_LIVE_TESTS") != "1":
        print(
            "Refusing to spend real CloudIQ calls without NOVA_LIVE_TESTS=1 "
            "(the key is shared and capped at 200/day). Use --dry-run to just validate.",
            file=sys.stderr,
        )
        return 2

    scores: list[CaseScore] = []
    with httpx.Client(timeout=REQUEST_TIMEOUT_S) as client:
        for index in range(calls):
            case = cases[index // args.repeat]
            score = score_case(case, ask(client, args.base_url, case), sections)
            scores.append(score)
            print_case(score, index + 1, calls)
            if index < calls - 1:
                time.sleep(args.delay)

    return finish(scores, args, dataset, write_report=True)


if __name__ == "__main__":
    sys.exit(main())
