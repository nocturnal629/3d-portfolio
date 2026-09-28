from typing import List, Optional

from pydantic import BaseModel, Field

# --- /api/ideas -------------------------------------------------------

MAX_NAME_LENGTH = 60
MAX_TITLE_LENGTH = 120
MAX_DESCRIPTION_LENGTH = 2000


class IdeaSubmissionRequest(BaseModel):
    """Mirrors the JSON body accepted by the real `POST /api/ideas` route
    in `src/app/api/ideas/route.ts`.

    Deliberately unbounded here (no `max_length`/`min_length`): this model
    exists to document the contract and pass requests through untouched.
    Enforcing the same limits here would make FastAPI itself reject
    out-of-bounds requests with a 422 before they ever reach the real
    route, which would test this proxy instead of the actual
    implementation.
    """

    name: Optional[str] = Field(
        default="",
        description=(
            f"Submitter's name. Blank is allowed - the server stores "
            f"'Anonymous' when empty. The real route rejects names over "
            f"{MAX_NAME_LENGTH} characters with a 400."
        ),
        examples=["Ada Lovelace"],
    )
    title: str = Field(
        ...,
        description=(
            f"Short idea title. Required, non-empty after trimming. The "
            f"real route rejects titles over {MAX_TITLE_LENGTH} characters "
            f"with a 400."
        ),
        examples=["A recipe app that plans your week"],
    )
    description: str = Field(
        ...,
        description=(
            f"Full idea description. Required, non-empty after trimming. "
            f"The real route rejects descriptions over "
            f"{MAX_DESCRIPTION_LENGTH} characters with a 400."
        ),
        examples=["Give it a few ingredients and it builds a 7-day meal plan."],
    )
    company: Optional[str] = Field(
        default="",
        description=(
            "Honeypot field. Real visitors never see or fill this input. "
            "If it's non-empty, the server pretends the submission succeeded "
            "but never writes it to the database."
        ),
    )


class IdeaSubmissionResponse(BaseModel):
    success: Optional[bool] = None
    error: Optional[str] = None


# --- /api/chat --------------------------------------------------------

MAX_ASK_LENGTH = 1000
MAX_FIT_LENGTH = 8000
MAX_HISTORY_MESSAGES = 8

SECTION_IDS = ("home", "projects", "experience", "certifications", "about", "signal")


class ChatMessage(BaseModel):
    role: str = Field(
        ...,
        description=(
            "Only 'user' and 'assistant' are accepted by the real route; "
            "anything else (notably 'system') is rejected with a 400. The "
            "system prompt is built server-side from the site's own content "
            "files, so clients cannot supply or override it."
        ),
        examples=["user"],
    )
    content: str = Field(..., examples=["What is their AWS experience?"])


class ChatRequest(BaseModel):
    """Mirrors the body accepted by `POST /api/chat`
    (`src/app/api/chat/route.ts`).

    Like the ideas model above, the fields are typed permissively on purpose
    so that every validation rule is exercised in the real route rather than
    short-circuited here by FastAPI's own 422.
    """

    messages: List[ChatMessage] = Field(
        ...,
        description=(
            f"Conversation so far, oldest first. The last entry must have "
            f"role 'user'. Only the final {MAX_HISTORY_MESSAGES} messages "
            f"are forwarded upstream."
        ),
    )
    mode: Optional[str] = Field(
        default="ask",
        description=(
            f"'ask' answers questions about the portfolio owner (max "
            f"{MAX_ASK_LENGTH} chars per message). 'fit' takes a pasted job "
            f"description and grades the match (max {MAX_FIT_LENGTH} chars). "
            f"Any other value falls back to 'ask'."
        ),
        examples=["ask"],
    )


class ChatResponse(BaseModel):
    reply: Optional[str] = Field(
        default=None,
        description="Assistant reply with the [[NAV: id]] directive stripped out.",
    )
    navigate: Optional[str] = Field(
        default=None,
        description=(
            "Section the console should fly the camera to. Either parsed from "
            "the model's directive or inferred by keyword from the question. "
            f"One of: {', '.join(SECTION_IDS)}."
        ),
    )
    served_model: Optional[str] = None
    servedModel: Optional[str] = Field(
        default=None,
        description="Which upstream model CloudIQ actually used, after its fallback chain.",
    )
    error: Optional[str] = None
