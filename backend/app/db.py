"""Read-only access to data/yale_som.db (one table: courses)."""

from __future__ import annotations

import re
import sqlite3
from functools import lru_cache

from .config import DB_PATH

# columns sent to the model; descriptions and bios are trimmed so tool results stay small
FIELDS = "course_number, course_title, course_category, course_session, faculty_1, daytimes, room, section, units"
DESC_CHARS = 500


def _conn() -> sqlite3.Connection:
    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True, check_same_thread=False)
    con.row_factory = sqlite3.Row
    return con


def _rows(sql: str, args: tuple = ()) -> list[dict]:
    with _conn() as con:
        return [{k: v for k, v in dict(r).items() if v not in (None, "")} for r in con.execute(sql, args)]


def slugify(faculty: str) -> str:
    """'Zaman, Tauhid' -> 'tauhid-zaman'."""
    return re.sub(r"[^a-z0-9]+", "-", display_name(faculty).lower()).strip("-")


def display_name(faculty: str) -> str:
    """'Zaman, Tauhid' -> 'Tauhid Zaman'."""
    last, _, first = faculty.partition(",")
    return f"{first.strip()} {last.strip()}".strip()


@lru_cache(maxsize=1)
def professors() -> dict[str, dict]:
    """slug -> {name, faculty, bio, courses}. Built once; the database never changes at runtime."""
    out: dict[str, dict] = {}
    rows = _rows(f"SELECT {FIELDS}, course_description, faculty_bio, syllabus FROM courses WHERE faculty_1 <> '' ORDER BY course_number")
    for r in rows:
        slug = slugify(r["faculty_1"])
        p = out.setdefault(slug, {"id": slug, "name": display_name(r["faculty_1"]), "faculty": r["faculty_1"], "bio": "", "courses": []})
        p["bio"] = p["bio"] or r.pop("faculty_bio", "")
        r.pop("faculty_bio", None)
        p["courses"].append(r)
    return out


def _trim(rows: list[dict]) -> list[dict]:
    for r in rows:
        if len(r.get("course_description", "")) > DESC_CHARS:
            r["course_description"] = r["course_description"][:DESC_CHARS].rstrip() + "..."
    return rows


STOPWORDS = {"a", "an", "the", "and", "or", "of", "in", "on", "for", "to", "with", "class", "classes", "course", "courses"}


def search_courses(query: str, limit: int = 12) -> list[dict]:
    """Rank sections by how many query words they contain (whole words, so 'AI' doesn't match 'sustainable').

    Title and category hits count more than description hits. Only 234 rows, so scoring in Python is instant.
    """
    words = [w for w in re.findall(r"[a-z0-9]+", query.lower()) if w not in STOPWORDS][:8]
    if not words:
        return []
    pats = [re.compile(rf"\b{re.escape(w)}", re.I) for w in words]
    scored = []
    for r in _rows(f"SELECT DISTINCT {FIELDS}, course_description FROM courses"):
        head = " ".join(str(r.get(k, "")) for k in ("course_number", "course_title", "course_category", "faculty_1"))
        body = r.get("course_description", "")
        score = sum(3 * bool(p.search(head)) + bool(p.search(body)) for p in pats)
        if score:
            scored.append((score, r["course_number"], r))
    scored.sort(key=lambda x: (-x[0], x[1]))
    seen, out = set(), []
    for _, _, r in scored:  # one row per course + instructor; sections differ only by time
        key = (r["course_number"], r["course_title"], r.get("faculty_1"))
        if key not in seen:
            seen.add(key)
            out.append(r)
    return _trim(out[: max(1, min(limit, 25))])


def get_course(course_number: str) -> list[dict]:
    num = re.sub(r"\s+", " ", course_number.strip().upper())
    sql = f"SELECT {FIELDS}, course_description, syllabus, timings_start, timings_end FROM courses WHERE UPPER(course_number) = ? OR REPLACE(UPPER(course_number), ' ', '') = ?"
    return _rows(sql, (num, num.replace(" ", "")))


def core_courses() -> list[dict]:
    return _rows(f"SELECT {FIELDS} FROM courses WHERE course_category = 'Core' OR course_type = 'core' ORDER BY course_number, daytimes")


def courses_by_professor(name: str) -> list[dict]:
    parts = [p for p in re.split(r"[\s,]+", name.strip()) if p]
    if not parts:
        return []
    cond = " AND ".join("faculty_1 LIKE ?" for _ in parts)
    return _trim(_rows(f"SELECT {FIELDS}, course_description FROM courses WHERE {cond} ORDER BY course_number", tuple(f"%{p}%" for p in parts)))


def courses_in_room(room: str) -> list[dict]:
    digits = re.sub(r"\D", "", room)
    pattern = f"%{digits}%" if digits else f"%{room.strip()}%"
    return _rows(f"SELECT {FIELDS} FROM courses WHERE room LIKE ? ORDER BY daytimes", (pattern,))


def categories() -> list[dict]:
    return _rows("SELECT course_category AS category, COUNT(*) AS sections FROM courses WHERE course_category <> '' GROUP BY 1 ORDER BY 2 DESC")
