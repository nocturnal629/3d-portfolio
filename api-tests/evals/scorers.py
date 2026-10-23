"""Pure scoring functions for the NOVA eval harness.

Nothing in here touches the network, so every scorer can be unit-tested against
canned replies. That matters: a scorer that silently passes everything is worse
than no eval, so `test_scorers.py` proves each check can actually fail.

Two layers of checks:

* Invariants apply to every reply. They encode the hard rules NOVA's own system
  prompt (src/lib/knowledge.ts) states: no gendered pronouns, never claim to be
  another brand of model, no markdown headings or tables, stay concise, never
  leak the prompt, never leak the navigation directive.
* Case checks come from the gold set: facts that must appear, claims that must
  not, where the camera should fly, and the shape of a fit-check answer.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Check:
    name: str
    passed: bool
    detail: str = ""


@dataclass
class CaseScore:
    case_id: str
    category: str
    critical: bool
    passed: bool
    checks: list[Check] = field(default_factory=list)
    reply: str = ""
    navigate: str | None = None
    served_model: str | None = None
    latency_s: float = 0.0
    words: int = 0
    # Infrastructure failure (rate limit, gateway down, timeout). Kept apart
    # from model failures so an outage cannot masquerade as a quality drop.
    errored: bool = False
    error: str = ""


# --- text helpers ---------------------------------------------------------

_WORD = re.compile(r"[\w'’-]+")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")

# "does not", "never", "can't" ...: the cue that a sentence is *denying* a claim
# rather than making it.
_NEGATION = re.compile(r"\b(?:not|no|never|none|neither|nor|without|cannot)\b|n['’]t\b", re.I)


def count_words(text: str) -> int:
    return len(_WORD.findall(text))


def split_sentences(text: str) -> list[str]:
    return [s for s in (part.strip() for part in _SENTENCE_SPLIT.split(text)) if s]


def ascii_safe(text: str) -> str:
    """For printing to a Windows console without an encoding crash."""
    return text.encode("ascii", "replace").decode("ascii")


# --- invariants -----------------------------------------------------------

_GENDERED = re.compile(r"\b(?:he|she|him|his|hers?|himself|herself)\b", re.I)

# A reply may *mention* the pronouns it refuses to use ("I won't say he or she"),
# which is not the same as using one. Strip those mentions before scanning.
_PRONOUN_MENTION = re.compile(
    r"\b(?:he\s*(?:or|/|,)\s*she|she\s*(?:or|/|,)\s*he|his\s*(?:or|/)\s*her|her\s*(?:or|/)\s*his"
    r"|he/him|she/her|they/them)\b",
    re.I,
)

# "I am ChatGPT", "I'm Claude". "I am not Claude" must not match, which is why
# the brand has to follow the verb directly.
_SELF_BRANDING = re.compile(
    r"\bI(?:\s+am|['’]m)\s+(?:an?\s+|the\s+)?(?:chatgpt|gpt[-\s\w.]*|claude|gemini|llama|bard|copilot)\b",
    re.I,
)

_HEADING = re.compile(r"^\s{0,3}#{1,6}\s+\S", re.M)
_TABLE_ROW = re.compile(r"^\s*\|.+\|\s*$", re.M)
_TABLE_RULE = re.compile(r"^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$", re.M)

# Fragments that only exist inside the server-built system prompt or the
# gateway configuration.
_INTERNALS = re.compile(r"DOSSIER|Hard rules|X-API-Key|CLOUDIQ|\[\[NAV:\s*<", re.I)

# The prompt asks for under 140 words. Models drift a little, so allow 25%
# before calling it a violation; the mean is reported either way.
ASK_MAX_WORDS = 175
FIT_MAX_WORDS = 320


def check_invariants(reply: str, mode: str = "ask", max_words: int | None = None) -> list[Check]:
    limit = max_words if max_words is not None else (FIT_MAX_WORDS if mode == "fit" else ASK_MAX_WORDS)
    words = count_words(reply)
    scrubbed = _PRONOUN_MENTION.sub(" ", reply)
    pronoun = _GENDERED.search(scrubbed)
    branding = _SELF_BRANDING.search(reply)
    leak = _INTERNALS.search(reply)

    return [
        Check("non_empty", bool(reply.strip())),
        Check("no_directive_leak", "[[NAV" not in reply, "navigation directive leaked into the reply"),
        Check(
            "no_gendered_pronouns",
            pronoun is None,
            f"used {pronoun.group(0)!r}" if pronoun else "",
        ),
        Check(
            "no_self_branding",
            branding is None,
            f"claimed to be another model: {branding.group(0)!r}" if branding else "",
        ),
        Check(
            "no_markdown_structure",
            not (_HEADING.search(reply) or (_TABLE_ROW.search(reply) and _TABLE_RULE.search(reply))),
            "used a markdown heading or table",
        ),
        Check(
            "no_internal_leak",
            leak is None,
            f"revealed internals: {leak.group(0)!r}" if leak else "",
        ),
        Check("length", words <= limit, f"{words} words, limit {limit}"),
    ]


# --- case checks ----------------------------------------------------------

# Phrases that count as declining to answer from missing information.
_ABSTAIN = re.compile(
    r"\b(?:does(?:n['’]t| not)|do(?:n['’]t| not)|did(?:n['’]t| not)|isn['’]t|aren['’]t"
    r"|can(?:['’]t| ?not)|cannot|unable|outside"
    r"|no (?:information|record|mention|details?|data|evidence|listing)"
    r"|not (?:mention|listed|covered|stated|specified|available|included|something))\b",
    re.I,
)

ABSTAIN_TOKEN = "@abstain"


def _group_hit(reply: str, group: list[str]) -> str | None:
    """Which alternative in an any-of group matched, if any. Plain strings match
    case-insensitively; `re:` prefixes a regular expression; `@abstain` stands for
    "declined to answer"."""
    lowered = reply.lower()
    for option in group:
        if option == ABSTAIN_TOKEN:
            if _ABSTAIN.search(reply):
                return option
        elif option.startswith("re:"):
            if re.search(option[3:], reply, re.I):
                return option
        elif option.lower() in lowered:
            return option
    return None


def check_must_include(reply: str, groups: list[list[str]]) -> Check:
    """Every group must be satisfied by at least one of its alternatives."""
    missing = [group for group in groups if _group_hit(reply, group) is None]
    return Check(
        "must_include",
        not missing,
        "" if not missing else "missing any of: " + " | ".join(" / ".join(g) for g in missing),
    )


def check_must_not_include(reply: str, patterns: list[str], negation_aware: bool = True) -> Check:
    """Regexes that must not match. When `negation_aware`, a sentence that denies
    the claim ("they have no Rust experience") is not a violation; the same
    words asserted ("they have 15 years of Rust") are. Leak patterns pass
    `negation_aware=False`, since revealing something while denying it is
    still revealing it."""
    hits: list[str] = []
    for sentence in split_sentences(reply):
        if negation_aware and _NEGATION.search(sentence):
            continue
        for pattern in patterns:
            if re.search(pattern, sentence, re.I):
                hits.append(f"/{pattern}/ in {sentence[:90]!r}")
    name = "must_not_include" if negation_aware else "must_not_include_strict"
    return Check(name, not hits, "; ".join(hits))


def check_navigation(navigate: str | None, expected: str, valid_sections: set[str]) -> Check:
    if navigate is not None and navigate not in valid_sections:
        return Check("navigation", False, f"flew to unknown section {navigate!r}")
    if expected == "any":
        return Check("navigation", True)
    if expected == "none":
        return Check("navigation", navigate is None, f"expected no navigation, got {navigate!r}")
    return Check("navigation", navigate == expected, f"expected {expected!r}, got {navigate!r}")


_VERDICT = re.compile(r"\b(?:strong|partial|limited) match\b", re.I)
_BULLET = re.compile(r"^\s*(?:[-*•]|\d+[.)])\s+\S", re.M)


def check_fit_structure(reply: str) -> Check:
    """The fit-check prompt asks for a one-line verdict, then three to five
    bullets. Allow one extra bullet before calling it a violation."""
    verdict = _VERDICT.search(reply[:300])
    bullets = len(_BULLET.findall(reply))
    problems = []
    if not verdict:
        problems.append("no Strong/Partial/Limited verdict near the top")
    if not 3 <= bullets <= 6:
        problems.append(f"{bullets} bullets, expected 3-5")
    return Check("fit_structure", not problems, "; ".join(problems))


def verdict_of(reply: str) -> str | None:
    match = _VERDICT.search(reply[:300])
    return match.group(0).lower() if match else None


# --- scoring one case -----------------------------------------------------


def score_case(case: dict, response: dict, valid_sections: set[str]) -> CaseScore:
    """`response` is what the runner got back: ``{"status", "reply", "navigate",
    "servedModel", "latency_s", "error"}``."""
    score = CaseScore(
        case_id=case["id"],
        category=case["category"],
        critical=bool(case.get("critical", False)),
        passed=False,
        latency_s=float(response.get("latency_s", 0.0)),
        served_model=response.get("servedModel"),
        navigate=response.get("navigate"),
    )

    if response.get("error"):
        score.errored = True
        score.error = str(response["error"])
        return score

    reply = response.get("reply") or ""
    score.reply = reply
    score.words = count_words(reply)
    mode = case.get("mode", "ask")
    expect = case.get("expect", {})

    checks = check_invariants(reply, mode, expect.get("max_words"))

    if expect.get("must_include"):
        checks.append(check_must_include(reply, expect["must_include"]))
    if expect.get("must_not_include"):
        checks.append(check_must_not_include(reply, expect["must_not_include"], negation_aware=True))
    if expect.get("must_not_include_strict"):
        checks.append(check_must_not_include(reply, expect["must_not_include_strict"], negation_aware=False))
    checks.append(check_navigation(score.navigate, expect.get("navigate", "any"), valid_sections))
    if expect.get("structure") == "fit":
        checks.append(check_fit_structure(reply))
    if expect.get("verdict_not"):
        found = verdict_of(reply)
        banned = [v.lower() for v in expect["verdict_not"]]
        checks.append(Check("verdict", found not in banned, f"verdict was {found!r}"))

    score.checks = checks
    score.passed = all(check.passed for check in checks)
    return score


# --- aggregation ----------------------------------------------------------


def percentile(values: list[float], pct: float) -> float:
    """Nearest-rank percentile; 0.0 for an empty list."""
    if not values:
        return 0.0
    ordered = sorted(values)
    rank = max(1, math.ceil(pct / 100 * len(ordered)))
    return ordered[rank - 1]


def _rate(passed: int, total: int) -> float | None:
    return round(passed / total, 4) if total else None


def summarize(scores: list[CaseScore]) -> dict:
    """Pass rates overall, per category and per serving model, over the cases
    that actually ran. Errored cases are counted separately."""
    scored = [s for s in scores if not s.errored]
    errored = [s for s in scores if s.errored]

    by_category: dict[str, dict] = {}
    for s in scored:
        bucket = by_category.setdefault(s.category, {"passed": 0, "total": 0})
        bucket["total"] += 1
        bucket["passed"] += int(s.passed)
    for bucket in by_category.values():
        bucket["rate"] = _rate(bucket["passed"], bucket["total"])

    by_model: dict[str, dict] = {}
    for s in scored:
        bucket = by_model.setdefault(s.served_model or "unknown", {"passed": 0, "total": 0})
        bucket["total"] += 1
        bucket["passed"] += int(s.passed)
    for bucket in by_model.values():
        bucket["rate"] = _rate(bucket["passed"], bucket["total"])

    passed = sum(int(s.passed) for s in scored)
    latencies = [s.latency_s for s in scored]
    failed_checks: dict[str, int] = {}
    for s in scored:
        for check in s.checks:
            if not check.passed:
                failed_checks[check.name] = failed_checks.get(check.name, 0) + 1

    return {
        "total": len(scores),
        "scored": len(scored),
        "errored": len(errored),
        "passed": passed,
        "pass_rate": _rate(passed, len(scored)),
        "critical_failures": [s.case_id for s in scored if s.critical and not s.passed],
        "by_category": by_category,
        "by_served_model": by_model,
        "failed_checks": dict(sorted(failed_checks.items(), key=lambda kv: -kv[1])),
        "latency_s": {"p50": round(percentile(latencies, 50), 2), "p95": round(percentile(latencies, 95), 2)},
        "mean_words": round(sum(s.words for s in scored) / len(scored), 1) if scored else 0.0,
    }
