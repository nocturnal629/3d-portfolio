"""FastAPI documentation + test harness for the 3D portfolio's HTTP API.

This does NOT reimplement anything — it's a thin proxy in front of the real
Next.js routes (`src/app/api/ideas/route.ts` and `src/app/api/chat/route.ts`).
Pydantic models document the exact contracts those routes expect and return,
and every request forwarded through here hits the real implementation, so the
interactive docs at /docs double as a live test client.

Run the Next.js dev server first (`npm run dev` in the repo root, port 3002),
then start this app and open http://localhost:8000/docs.
"""

import os
from typing import Any, Dict

import httpx
from fastapi import FastAPI, Response
from fastapi.responses import RedirectResponse

from app.schemas import (
    ChatRequest,
    ChatResponse,
    IdeaSubmissionRequest,
    IdeaSubmissionResponse,
)

NEXT_API_BASE_URL = os.environ.get("NEXT_API_BASE_URL", "http://localhost:3002")

# The chat route calls CloudIQ, which has its own 60s upstream budget and may
# be cold-starting on a free tier instance.
CHAT_TIMEOUT_SECONDS = 90

app = FastAPI(
    title="Aldrian A 3D Portfolio API (test harness)",
    description=(
        "Interactive documentation and live test client for the portfolio's "
        "HTTP API. Every call made from this Swagger UI is forwarded to the "
        f"real Next.js server at `{NEXT_API_BASE_URL}` — there's no mock or "
        "fake data here, just a documented front door to the real "
        "implementation."
    ),
    version="1.0.0",
)


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")


@app.post(
    "/api/ideas",
    response_model=IdeaSubmissionResponse,
    summary="Submit an idea",
    tags=["ideas"],
    responses={
        200: {"description": "Saved (or silently dropped if the honeypot field was filled)."},
        400: {"description": "Validation failed — missing/too-long title, description, or name."},
        500: {"description": "Server-side failure, e.g. BLOB_READ_WRITE_TOKEN isn't configured yet."},
    },
    description=(
        "Proxies to `POST {base_url}/api/ideas`. Matches the validation rules "
        "in `src/app/api/ideas/route.ts`: title and description are required "
        "(after trimming) and capped at 120 / 2000 characters; name defaults "
        "to 'Anonymous' and is capped at 60 characters; and the `company` "
        "field is a honeypot — filling it makes the server return "
        "`{\"success\": true}` without writing anything to the database."
    ),
)
async def submit_idea(payload: IdeaSubmissionRequest, response: Response) -> Dict[str, Any]:
    async with httpx.AsyncClient(base_url=NEXT_API_BASE_URL, timeout=15) as client:
        upstream = await client.post("/api/ideas", json=payload.model_dump())

    response.status_code = upstream.status_code
    try:
        return upstream.json()
    except ValueError:
        return {"error": upstream.text or "Upstream returned a non-JSON response."}


@app.post(
    "/api/chat",
    response_model=ChatResponse,
    summary="Ask NOVA",
    tags=["chat"],
    responses={
        200: {"description": "Model replied. `navigate` names the section to fly to, if any."},
        400: {"description": "Malformed body, empty message, or a message over the mode's length cap."},
        429: {"description": "Per-IP limit (6/min) or CloudIQ's own per-key limit was hit."},
        503: {"description": "CLOUDIQ_API_KEY is not configured on the Next.js server."},
        504: {"description": "CloudIQ did not answer within the gateway timeout."},
    },
    description=(
        "Proxies to `POST {base_url}/api/chat`, the server-side front door to "
        "CloudIQ. The browser never sees the CloudIQ API key.\n\n"
        "Validation implemented in `src/app/api/chat/route.ts`: `messages` "
        "must be a non-empty array whose entries each have a `role` of "
        "'user' or 'assistant' and a string `content`; the last entry must be "
        "from the user and non-empty after trimming; and it must be under "
        "1000 characters in `ask` mode or 8000 in `fit` mode.\n\n"
        "**Note:** a 200 here costs a real model call against a shared, "
        "rate-limited key. The automated tests only exercise the validation "
        "paths for that reason."
    ),
)
async def ask_nova(payload: ChatRequest, response: Response) -> Dict[str, Any]:
    async with httpx.AsyncClient(base_url=NEXT_API_BASE_URL, timeout=CHAT_TIMEOUT_SECONDS) as client:
        upstream = await client.post("/api/chat", json=payload.model_dump())

    response.status_code = upstream.status_code
    try:
        return upstream.json()
    except ValueError:
        return {"error": upstream.text or "Upstream returned a non-JSON response."}
