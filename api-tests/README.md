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

Those need `CLOUDIQ_API_KEY` set for the Next.js server (see
`.env.local.example` in the repo root); without it the route returns 503 and
the live tests fail.

### Notes on the ideas tests

Until `BLOB_READ_WRITE_TOKEN` is available to the Next.js server locally,
valid submissions will 500 at the save step. The tests account for this
(`test_valid_submission_passes_validation` accepts either `200` or a `500`
whose error message confirms it failed at the save step, not at validation).
Blob store env vars are scoped per-environment in the Vercel dashboard, so
"Development" needs to be checked on the store's connection before
`vercel env pull` can fetch it for local use.
