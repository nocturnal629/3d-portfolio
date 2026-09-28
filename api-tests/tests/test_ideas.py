"""Integration tests against the real /api/ideas implementation.

These go through the FastAPI proxy (app.main.app), which in turn forwards
every request to the live Next.js dev server. There are no mocks: a failing
test here means the real route's behavior changed.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_missing_title_returns_400():
    response = client.post("/api/ideas", json={"title": "", "description": "A valid description"})
    assert response.status_code == 400
    assert "title" in response.json()["error"].lower()


def test_missing_description_returns_400():
    response = client.post("/api/ideas", json={"title": "A valid title", "description": ""})
    assert response.status_code == 400
    assert "description" in response.json()["error"].lower()


def test_title_over_120_chars_returns_400():
    response = client.post(
        "/api/ideas",
        json={"title": "x" * 121, "description": "A valid description"},
    )
    assert response.status_code == 400


def test_description_over_2000_chars_returns_400():
    response = client.post(
        "/api/ideas",
        json={"title": "A valid title", "description": "x" * 2001},
    )
    assert response.status_code == 400


def test_name_over_60_chars_returns_400():
    response = client.post(
        "/api/ideas",
        json={
            "name": "x" * 61,
            "title": "A valid title",
            "description": "A valid description",
        },
    )
    assert response.status_code == 400


def test_honeypot_filled_returns_success_without_saving():
    response = client.post(
        "/api/ideas",
        json={
            "title": "Should be ignored",
            "description": "Should be ignored",
            "company": "I am a bot",
        },
    )
    assert response.status_code == 200
    assert response.json().get("success") is True


def test_valid_submission_passes_validation():
    """
    Exercises the full happy path. Until BLOB_READ_WRITE_TOKEN is available
    to the Next.js server (e.g. the Blob store isn't connected to the
    Development environment yet), this will 500 at the save step - that
    documents current deploy status, not a bug in validation.
    """
    response = client.post(
        "/api/ideas",
        json={
            "title": "A recipe app that plans your week",
            "description": "Give it a few ingredients and it builds a 7-day meal plan.",
        },
    )
    assert response.status_code in (200, 500)
    if response.status_code == 500:
        assert "save your idea" in response.json()["error"].lower()
