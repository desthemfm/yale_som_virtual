# Backend: Professor Agents

A FastAPI server where every professor in `data/yale_som.db` (109 of them) is a PydanticAI agent.
Each agent's instructions are built from the database (their courses, times, rooms, and bio), plus
shared course knowledge (stats, regression, the central limit theorem, variance, AI foundations) and
a speaking style. All agents share database tools, so they can answer questions about other classes.

## Setup

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env   # then fill in values
```

| Variable | Purpose |
| --- | --- |
| `PORTKEY_API_KEY` | Portkey key for all AI calls. If missing here, the first `.env` found in a parent folder is used. |
| `OPENAI_MODEL` | Model name sent through Portkey (default `gpt-6-luna`). |
| `ALLOWED_ORIGINS` | Comma-separated frontend URLs allowed to call the API (default `http://localhost:5173`). |

## Run

```bash
.venv/bin/uvicorn app.main:app --port 8000
```

The Vite dev server proxies `/api` to port 8000. For a deployed frontend, build it with
`VITE_API_URL=https://your-backend.example.com`.

## API

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/health` | Model name and professor count |
| GET | `/api/professors` | Every professor id, name, and courses |
| GET | `/api/professors/{id}` | One professor's bio and sections |
| POST | `/api/professors/{id}/chat` | `{"message": "...", "session_id": null}` returns `{reply, session_id, professor, model}` |

Professor ids are the name in lowercase with dashes, e.g. `tauhid-zaman`.

## Files

- `app/config.py`: loads `.env`, builds the Portkey model.
- `app/db.py`: read-only database queries.
- `app/professors.py`: the prompt template, the shared tools, and one agent per professor.
- `app/styles.py`: speaking styles by professor id. Add a style here to give a professor a voice.
- `app/main.py`: the API routes and per-session chat memory (kept in memory; a restart clears it).
