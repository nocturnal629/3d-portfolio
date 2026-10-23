# Portfolio API — Docs & Tests

A FastAPI harness for the two HTTP routes this site exposes:

| Route        | Implementation                  | What it does                                      |
| ------------ | ------------------------------- | ------------------------------------------------- |
| `/api/chat`  | `src/app/api/chat/route.ts`     | NOVA, the AI console. Server-side proxy to CloudIQ |
| `/api/ideas` | `src/app/api/ideas/route.ts`    | "Transmit a signal" idea submissions               |

This app doesn't reimplement either one. It's a thin, documented proxy: every
request you send through it is forwarded to the real Next.js server, so the
interactive Swagger docs double as a live test client, and `pytest` runs as an
integration test against the real implementation.

## Setup

```bash
cd api-tests
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate # macOS/Linux
pip install -r requirements.txt
```

## 1. Start the real API first

From the repo root, in a separate terminal:

```bash
npm run dev
```

This serves the actual implementation at `http://localhost:3002`.

## 2. Run the docs / interactive test client

```bash
cd api-tests
uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:8000/docs**. Every "Try it out" call hits the real
route on your Next.js dev server — there's nothing mocked.

Pointing at a different server:

```bash
NEXT_API_BASE_URL=https://your-preview-url.vercel.app uvicorn app.main:app --reload --port 8000
```

## 3. Run the automated tests

With the Next.js dev server still running:

```bash
cd api-tests
pytest -v
```

### What the tests cover

**`test_ideas.py`** — the validation contract in `src/app/api/ideas/route.ts`:
required and max-length checks on title, description, and name, plus the
`company` honeypot silently dropping spam.

**`test_chat.py`** — the validation contract in `src/app/api/chat/route.ts`:
empty and blank messages, the last message having to come from the user,
rejection of a client-supplied `system` role, the per-mode length caps
(1000 chars for `ask`, 8000 for `fit`), and an unknown `mode` falling back
to `ask`.

### Why the chat tests don't call the model by default

This deployment shares **one** CloudIQ API key across every visitor, and
CloudIQ caps that key at 10 requests/minute and 200/day. A suite that made a
real model call on every run would eat the site's daily budget.

So the default run only exercises paths the route rejects *before* it reaches
CloudIQ. The tests that genuinely call the model are marked `@live_only` and
skipped unless you opt in:

```bash
NOVA_LIVE_TESTS=1 pytest -v
```

Those need `CLOUDIQ_API_KEY` and `CLOUDIQ_BASE_URL` set for the Next.js server;
without them the route returns 503 and the live tests fail.

### Notes on the ideas tests

Until `BLOB_READ_WRITE_TOKEN` is available to the Next.js server locally,
valid submissions will 500 at the save step. The tests account for this
(`test_valid_submission_passes_validation` accepts either `200` or a `500`
whose error message confirms it failed at the save step, not at validation).
Blob store env vars are scoped per-environment in the Vercel dashboard, so
"Development" needs to be checked on the store's connection before
`vercel env pull` can fetch it for local use.

## NOVA eval harness

`evals/` measures how well NOVA answers, not just whether the route validates.
It sends a hand-written gold set through the real `/api/chat` and scores the
replies against the rules NOVA's own system prompt states.

```bash
cd api-tests
pytest evals -q                       # offline: scorers, gold set, runner. No server needed
python -m evals.runner --dry-run      # validate the gold set and show the plan
NOVA_LIVE_TESTS=1 python -m evals.runner --base-url https://your-site.example   # real model calls
```

Live runs are opt-in with the same `NOVA_LIVE_TESTS=1` switch as the live pytest
cases, and are throttled to one call every 12 seconds. The 28 cases cost 28 of
the shared key's 200 daily calls and take about six minutes. Useful flags:
`--only factual injection`, `--ids fact-location`, `--limit 5`, `--repeat 3`
(a case then passes only if every run passes), `--delay`, `--min-pass`.

### What it checks

Every reply is held to **invariants** taken from the system prompt: no gendered
pronouns, never claiming to be another model, no markdown headings or tables,
under 140 words (25% tolerance; fit-check replies get more), no prompt or
gateway internals, and no `[[NAV: ...]]` directive leaking into the text.

On top of that each case in `golden.json` can require facts, forbid claims,
require a navigation target, or require the fit-check shape (a verdict, then
three to five bullets). Categories: `factual`, `navigation`, `out_of_scope`,
`policy`, `injection`, `fit_check`. Cases marked `critical` (fabrication, prompt
leaks, pronouns, identity, an oversold fit verdict) must all pass.

### Design choices worth knowing

- **The gold is hand-written, not generated from the site's data.** An answer key
  derived from the thing under test cannot catch anything. Instead each case lists
  `evidence` strings that must appear in `src/data/*.ts` and `absent` strings (the
  hallucination traps) that must not, and `pytest evals` fails if the content drifts
  out from under the gold.
- **Forbidden claims are negation-aware.** "They have no Rust experience" is a good
  answer; "They have 5 years of Rust" is not. Leak patterns are the exception and
  ignore negation, because revealing something while denying it is still revealing it.
- **Infrastructure failures are not quality failures.** A 429 that never clears, a
  503 or a timeout is recorded as an error and reported separately, so an outage
  cannot look like NOVA getting worse. If more than 20% of runs error, the run is
  declared unrepresentative.
- **The scorers are tested for failing, not just passing.** `evals/test_scorers.py`
  feeds each check a reply that should trip it. Deliberately breaking each scorer,
  one at a time, makes the suite fail.
- **Results vary run to run** (CloudIQ's fallback chain can answer with different
  models, and the report breaks pass rate down by `served_model`). Treat a single
  failure as a prompt to look, and use `--repeat` before calling something a regression.

### Comparing runs

```bash
python -m evals.runner --save-baseline evals/baseline.json     # record per-case outcomes
python -m evals.runner --baseline evals/baseline.json          # list regressions and fixes
python -m evals.runner --baseline evals/baseline.json --fail-on-regression
```

Full replies and failing checks for every run are written to
`evals/reports/<timestamp>.json` (git-ignored).

### What it does not do

There is no LLM judge and no semantic grounding score: it checks for specific
facts and specific violations, not whether a free-form answer is "good". It also
does not run in CI. A live run spends the shared daily budget, so the offline
`pytest evals` is what is safe to automate.
