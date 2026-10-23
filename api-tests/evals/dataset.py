"""Loading and validating the gold set.

Validation runs offline (no model, no server), so a malformed or stale gold set
fails in `pytest` before it can waste any of the shared CloudIQ budget.

The gold is deliberately *not* generated from the site's data, because an eval
whose answer key is derived from the thing under test cannot catch anything.
It is checked against the data instead: each case's `evidence` strings must
appear in src/data/*.ts, and its `absent` strings (the hallucination traps)
must not. If the content changes underneath the gold, validation says so.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

EVALS_DIR = Path(__file__).resolve().parent
REPO_ROOT = EVALS_DIR.parents[1]
DATA_DIR = REPO_ROOT / "src" / "data"
GOLDEN_PATH = EVALS_DIR / "golden.json"

CATEGORIES = {"factual", "navigation", "out_of_scope", "policy", "injection", "fit_check"}
MODES = {"ask", "fit"}
EXPECT_KEYS = {
    "must_include",
    "must_not_include",
    "must_not_include_strict",
    "navigate",
    "max_words",
    "structure",
    "verdict_not",
}

# The route's own caps (src/app/api/chat/route.ts). A case over these would be
# rejected with a 400 before it ever reached the model.
MAX_QUESTION_CHARS = {"ask": 1_000, "fit": 8_000}


def load_dataset(path: Path = GOLDEN_PATH) -> dict:
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def valid_section_ids() -> set[str]:
    """Section ids parsed from the site's own source of truth, so the gold's
    expected navigation targets cannot go stale."""
    text = (DATA_DIR / "sections.ts").read_text(encoding="utf-8")
    return set(re.findall(r"^\s*id:\s*'([a-z]+)'", text, re.M))


def source_text() -> str:
    """Everything NOVA is grounded in, as one string."""
    return "\n".join(path.read_text(encoding="utf-8") for path in sorted(DATA_DIR.glob("*.ts")))


def _compiles(pattern: str) -> str | None:
    try:
        re.compile(pattern)
    except re.error as error:
        return str(error)
    return None


def validate_dataset(dataset: dict, sections: set[str], source: str) -> list[str]:
    """Returns human-readable problems; empty means the gold set is sound."""
    problems: list[str] = []
    cases = dataset.get("cases")
    if not isinstance(cases, list) or not cases:
        return ["dataset has no cases"]

    seen: set[str] = set()
    categories_used: set[str] = set()

    for index, case in enumerate(cases):
        label = case.get("id") or f"#{index}"

        for required in ("id", "category", "question", "expect"):
            if required not in case:
                problems.append(f"{label}: missing {required!r}")
        if not isinstance(case.get("expect"), dict):
            continue

        if case.get("id") in seen:
            problems.append(f"{label}: duplicate id")
        seen.add(case.get("id", ""))

        category = case.get("category")
        categories_used.add(category)
        if category not in CATEGORIES:
            problems.append(f"{label}: unknown category {category!r}")

        mode = case.get("mode", "ask")
        if mode not in MODES:
            problems.append(f"{label}: unknown mode {mode!r}")
        question = case.get("question", "")
        if not question.strip():
            problems.append(f"{label}: empty question")
        elif mode in MAX_QUESTION_CHARS and len(question) > MAX_QUESTION_CHARS[mode]:
            problems.append(f"{label}: question exceeds the {mode} cap of {MAX_QUESTION_CHARS[mode]} characters")

        expect = case["expect"]
        for key in expect:
            if key not in EXPECT_KEYS:
                problems.append(f"{label}: unknown expect key {key!r}")

        navigate = expect.get("navigate", "any")
        allowed_targets = (sections - {"home"}) | {"any", "none"}
        if navigate not in allowed_targets:
            problems.append(f"{label}: navigate {navigate!r} is not a section id (have {sorted(allowed_targets)})")

        if expect.get("structure") not in (None, "fit"):
            problems.append(f"{label}: unknown structure {expect['structure']!r}")
        if expect.get("structure") == "fit" and mode != "fit":
            problems.append(f"{label}: structure 'fit' only makes sense in fit mode")

        for key in ("must_not_include", "must_not_include_strict"):
            for pattern in expect.get(key, []):
                error = _compiles(pattern)
                if error:
                    problems.append(f"{label}: bad regex in {key} {pattern!r}: {error}")

        for group in expect.get("must_include", []):
            if not isinstance(group, list) or not group:
                problems.append(f"{label}: must_include groups must be non-empty lists")
                continue
            for option in group:
                if option.startswith("re:"):
                    error = _compiles(option[3:])
                    if error:
                        problems.append(f"{label}: bad regex in must_include {option!r}: {error}")

        has_assertion = any(
            expect.get(key)
            for key in ("must_include", "must_not_include", "must_not_include_strict", "structure", "verdict_not")
        ) or navigate != "any"
        if not has_assertion:
            problems.append(f"{label}: no case-specific assertion; only invariants would run")

        for term in case.get("evidence", []):
            if term not in source:
                problems.append(f"{label}: evidence {term!r} not found in src/data (gold has drifted from the site)")
        for term in case.get("absent", []):
            if re.search(rf"\b{re.escape(term)}\b", source):
                problems.append(f"{label}: trap term {term!r} now appears in src/data, so it is no longer a trap")

    for category in CATEGORIES - categories_used:
        problems.append(f"no cases for category {category!r}")

    return problems
