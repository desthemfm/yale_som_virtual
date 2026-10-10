"""Settings and the shared model factory (Portkey -> OpenAI Responses API)."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI

os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")

from pydantic_ai.models.openai import OpenAIResponsesModel  # noqa: E402
from pydantic_ai.providers.openai import OpenAIProvider  # noqa: E402

BACKEND = Path(__file__).resolve().parent.parent
REPO = BACKEND.parent

# backend/.env wins; otherwise use the first .env found walking up (the class folder's Code/.env).
load_dotenv(BACKEND / ".env", override=False)
for folder in BACKEND.parents:
    if (folder / ".env").exists():
        load_dotenv(folder / ".env", override=False)
        break

MODEL_NAME = os.getenv("OPENAI_MODEL") or "gpt-6-luna"
PORTKEY_BASE_URL = os.getenv("PORTKEY_BASE_URL") or "https://api.portkey.ai/v1"
DB_PATH = Path(os.getenv("DB_PATH") or REPO / "data" / "yale_som.db")
ALLOWED_ORIGINS = [
    o if "://" in o else f"https://{o}"  # Render passes bare hostnames between services
    for o in (x.strip().rstrip("/") for x in (os.getenv("ALLOWED_ORIGINS") or "http://localhost:5173").split(","))
    if o
]
REQUEST_TIMEOUT_SEC = 90


def make_model() -> OpenAIResponsesModel:
    api_key = os.getenv("PORTKEY_API_KEY")
    if not api_key:
        raise RuntimeError("PORTKEY_API_KEY is missing. Add it to backend/.env or the class folder's .env.")
    client = AsyncOpenAI(base_url=PORTKEY_BASE_URL, api_key=api_key, timeout=REQUEST_TIMEOUT_SEC, max_retries=1)
    return OpenAIResponsesModel(MODEL_NAME, provider=OpenAIProvider(openai_client=client))
