"""FastAPI backend: chat with any Yale SOM professor as an AI agent.

Run from backend/:  .venv/bin/uvicorn app.main:app --port 8000
"""

from __future__ import annotations

import logging
import uuid
from collections import OrderedDict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse, UserPromptPart

from . import db
from .config import ALLOWED_ORIGINS, MODEL_NAME
from .professors import agent_for

log = logging.getLogger("professors")

app = FastAPI(title="Yale SOM Virtual: Professor Agents")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["GET", "POST"], allow_headers=["*"])

# chat memory lives in this process: session id -> messages. Fine for a demo; restarts clear it.
MAX_SESSIONS = 500
MAX_MESSAGES = 40
SESSIONS: OrderedDict[str, list[ModelMessage]] = OrderedDict()


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: str | None = None


class ChatOut(BaseModel):
    reply: str
    session_id: str
    professor: str
    model: str | None  # the model the gateway says answered, not just the one we asked for


def _trim_history(messages: list[ModelMessage]) -> list[ModelMessage]:
    """Keep the last MAX_MESSAGES, cut at a student turn so no tool call loses its result."""
    if len(messages) <= MAX_MESSAGES:
        return messages
    for i in range(len(messages) - MAX_MESSAGES, len(messages)):
        m = messages[i]
        if isinstance(m, ModelRequest) and any(isinstance(part, UserPromptPart) for part in m.parts):
            return messages[i:]
    return messages[-1:]


def _summary(p: dict) -> dict:
    return {"id": p["id"], "name": p["name"], "courses": sorted({f"{c['course_number']} {c['course_title']}" for c in p["courses"]})}


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "model": MODEL_NAME, "professors": len(db.professors())}


@app.get("/api/professors")
def list_professors() -> list[dict]:
    return [_summary(p) for p in sorted(db.professors().values(), key=lambda p: p["name"])]


@app.get("/api/professors/{professor_id}")
def get_professor(professor_id: str) -> dict:
    p = db.professors().get(professor_id)
    if not p:
        raise HTTPException(404, f"No professor with id '{professor_id}'")
    return {**_summary(p), "bio": p["bio"], "sections": p["courses"]}


@app.post("/api/professors/{professor_id}/chat")
async def chat(professor_id: str, body: ChatIn) -> ChatOut:
    p = db.professors().get(professor_id)
    if not p:
        raise HTTPException(404, f"No professor with id '{professor_id}'")
    session_id = body.session_id or uuid.uuid4().hex
    key = f"{professor_id}:{session_id}"
    history = SESSIONS.get(key, [])
    try:
        result = await agent_for(professor_id).run(body.message, message_history=history)
    except Exception as exc:  # gateway/model errors: log the type, never the request headers or key
        log.exception("chat failed for %s", professor_id)
        raise HTTPException(502, f"The professor couldn't answer right now ({type(exc).__name__}). Try again.") from exc
    SESSIONS[key] = _trim_history(result.all_messages())
    SESSIONS.move_to_end(key)
    while len(SESSIONS) > MAX_SESSIONS:
        SESSIONS.popitem(last=False)
    served = next((m.model_name for m in reversed(result.new_messages()) if isinstance(m, ModelResponse)), None)
    return ChatOut(reply=result.output, session_id=session_id, professor=p["name"], model=served)
