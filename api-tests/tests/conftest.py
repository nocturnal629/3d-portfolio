import os

import httpx
import pytest

NEXT_API_BASE_URL = os.environ.get("NEXT_API_BASE_URL", "http://localhost:3002")

# Live chat tests cost a real model call against a shared, rate-limited
# CloudIQ key, so they are opt-in.
LIVE_CHAT = os.environ.get("NOVA_LIVE_TESTS") == "1"


@pytest.fixture(scope="session", autouse=True)
def _require_next_dev_server():
    try:
        httpx.get(NEXT_API_BASE_URL, timeout=5)
    except httpx.HTTPError:
        pytest.exit(
            f"Could not reach the Next.js dev server at {NEXT_API_BASE_URL}. "
            "Start it first with `npm run dev` in the repo root, then re-run pytest.",
            returncode=1,
        )
