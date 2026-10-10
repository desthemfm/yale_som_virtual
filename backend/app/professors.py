"""Every professor in the course database is its own PydanticAI agent.

The agent's instructions come from the database (their courses, schedule, rooms, bio), plus shared
teaching knowledge and the professor's speaking style. All agents share the database lookup tools,
so any professor can answer questions about other classes.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_ai import Agent

from . import db
from .backgrounds import background_for
from .config import make_model
from .styles import style_for

COURSE_KNOWLEDGE = """\
Course material you know cold and can teach at an MBA level, with intuition first and math second:
- Probability: random variables, expected value, variance and standard deviation, covariance and
  correlation, conditional probability, Bayes' rule, independence.
- Distributions: binomial, Poisson, normal, uniform, exponential; z-scores.
- Sampling and inference: the law of large numbers, the central limit theorem (why sample means are
  approximately normal, standard error = sigma / sqrt(n)), confidence intervals, hypothesis tests,
  p-values, Type I/II errors, statistical vs practical significance, A/B testing.
- Regression: simple and multiple linear regression, OLS, interpreting coefficients, R-squared,
  residuals, dummy variables, interactions, multicollinearity, omitted variable bias, correlation
  vs causation, overfitting, train/test splits.
- AI foundations: how LLMs work at a high level, prompting, agents and tools, evaluation, when to use
  a cheaper model, and classic ML (classification, decision trees, clustering).
- Your own courses' subject matter, as described below.
When you teach, use a small worked example with numbers when it helps, then check understanding."""

RULES = """\
Rules:
- For any fact about courses, schedules, rooms, sections, or other professors, call your database
  tools. Never invent course facts; if the database doesn't have it, say so.
- "Core" courses are the required first-year MBA courses; use list_core_courses for those.
- Syllabus links in the database are Yale Canvas links and need a Yale login to open.
- You are chatting in a small window inside a 3D model of Evans Hall. Keep replies short (2-6
  sentences) unless the student asks you to go deeper. Plain text only: no markdown headings,
  tables, or LaTeX. Write math inline like: SE = sigma / sqrt(n).
- Stay in character, but be accurate and kind. You are an AI version of this professor for a class
  demo, so if asked, say so honestly."""


def _course_lines(p: dict) -> str:
    lines = []
    for c in p["courses"]:
        when = c.get("daytimes") or "time TBA"
        where = c.get("room") or "room TBA"
        lines.append(f"- {c['course_number']} {c['course_title']} ({c.get('course_category', 'n/a')}, {c.get('course_session', '')}): {when}, {where}")
    seen, descs = set(), []
    for c in p["courses"]:
        if c["course_number"] not in seen and c.get("course_description"):
            seen.add(c["course_number"])
            descs.append(f"{c['course_number']} {c['course_title']}: {c['course_description']}")
    return "\n".join(lines) + ("\n\nCourse descriptions:\n" + "\n\n".join(descs) if descs else "")


def build_instructions(p: dict) -> str:
    return "\n\n".join(
        [
            f"You are Professor {p['name']}, a faculty member at the Yale School of Management, talking with a "
            "student who walked up to you in a virtual Evans Hall.",
            f"Your Fall 2026 teaching (from the course database):\n{_course_lines(p)}",
            f"Your bio:\n{p['bio']}" if p["bio"] else "",
            background_for(p["id"]),
            f"Speaking style:\n{style_for(p['id'])}",
            COURSE_KNOWLEDGE,
            RULES,
        ]
    ).replace("\n\n\n\n", "\n\n")


# ---------------------------------------------------------------- tools shared by every professor


def search_courses(query: str, limit: int = 12) -> list[dict]:
    """Keyword search over course titles, descriptions, categories, instructors, and course numbers.

    Results are ranked by how many keywords match, so include synonyms for broad topics,
    e.g. "AI artificial intelligence machine learning" or "healthcare health medicine".

    Args:
        query: Keywords, e.g. "regression", "private equity", "MGT 403".
        limit: Maximum number of sections to return (1-25).
    """
    return db.search_courses(query, limit)


def get_course(course_number: str) -> list[dict]:
    """Full details for every section of one course: description, instructor, times, room, syllabus link.

    Args:
        course_number: Course number such as "MGT 409" or "MGT403".
    """
    return db.get_course(course_number)


def list_core_courses() -> list[dict]:
    """All sections of the required Core MBA courses with instructors, sessions, times, and rooms."""
    return db.core_courses()


def courses_by_professor(name: str) -> list[dict]:
    """Courses taught by a professor this term.

    Args:
        name: Full or partial name, e.g. "Zaman" or "Kai Hao Yang".
    """
    return db.courses_by_professor(name)


def courses_in_room(room: str) -> list[dict]:
    """Courses that meet in a room, e.g. "2200" or "EVANS 4430"."""
    return db.courses_in_room(room)


def list_categories() -> list[dict]:
    """Course categories (Finance, Marketing, Core, EMBA, ...) with how many sections each has."""
    return db.categories()


TOOLS = [search_courses, get_course, list_core_courses, courses_by_professor, courses_in_room, list_categories]


@lru_cache(maxsize=None)
def agent_for(professor_id: str) -> Agent[None, str]:
    """Build (once) and return the agent for one professor. Raises KeyError for unknown ids."""
    p = db.professors()[professor_id]
    return Agent(make_model(), name=p["name"], instructions=build_instructions(p), tools=TOOLS, retries=2)
