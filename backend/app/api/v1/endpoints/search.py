"""
Global 360 Search endpoint — Phase 19.

GET /api/v1/search?q={query}&types=events,courses,econtent,facilities,policies,alumni

- Role-aware: only returns data the authenticated user is permitted to see.
- Never exposes: other students' personal records, private notes, admin-only data.
- Parallel sub-searches using asyncio.gather.
- Max 20 results, sorted by relevance score.
"""
from __future__ import annotations

import asyncio
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────────────────

class SearchResultItem(BaseModel):
    id: str
    type: str           # events | econtent | facilities | policies | alumni | announcements
    title: str
    subtitle: Optional[str] = None
    badge: Optional[str] = None
    href: str
    relevance: float = 1.0


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem]
    total: int
    took_ms: Optional[int] = None


# ── Helper ─────────────────────────────────────────────────────────────────────

def _score(title: str, subtitle: str, query: str) -> float:
    """Simple relevance scorer — title prefix match > word match > substring."""
    q = query.lower().strip()
    t = title.lower()
    s = (subtitle or "").lower()
    if t.startswith(q):
        return 3.0
    if re.search(r"\b" + re.escape(q), t):
        return 2.0
    if q in t:
        return 1.5
    if q in s:
        return 1.0
    return 0.5


# ── Sub-Searchers ─────────────────────────────────────────────────────────────

async def _search_events(q: str, db: AsyncSession, role: str) -> List[SearchResultItem]:
    try:
        rows = await db.execute(
            text("""
                SELECT id, title, description, event_date::text, status
                FROM events
                WHERE (title ILIKE :q OR description ILIKE :q)
                  AND (status = 'published' OR status = 'upcoming' OR :role = 'admin')
                LIMIT 10
            """),
            {"q": f"%{q}%", "role": role},
        )
        return [
            SearchResultItem(
                id=str(r.id),
                type="events",
                title=r.title,
                subtitle=r.event_date,
                badge=r.status.title() if r.status else None,
                href="/student/events",
                relevance=_score(r.title, r.description or "", q),
            )
            for r in rows.fetchall()
        ]
    except Exception:
        return []


async def _search_courses(q: str, db: AsyncSession) -> List[SearchResultItem]:
    try:
        rows = await db.execute(
            text("""
                SELECT id, code, title, credits, semester
                FROM courses
                WHERE (code ILIKE :q OR title ILIKE :q)
                  AND is_active = true
                LIMIT 10
            """),
            {"q": f"%{q}%"},
        )
        return [
            SearchResultItem(
                id=str(r.id),
                type="courses",
                title=f"{r.code} - {r.title}",
                subtitle=f"Semester {r.semester} • {r.credits} Credits",
                badge="Course",
                href="/student/attendance",
                relevance=_score(r.title, r.code, q),
            )
            for r in rows.fetchall()
        ]
    except Exception:
        return []


async def _search_econtent(q: str, db: AsyncSession, role: str) -> List[SearchResultItem]:
    try:
        status_filter = "AND status = 'published'" if role not in ("admin", "faculty") else ""
        rows = await db.execute(
            text(f"""
                SELECT id, title, description, subject_name, content_type, status
                FROM econtent_items
                WHERE (title ILIKE :q OR subject_name ILIKE :q OR description ILIKE :q)
                  {status_filter}
                LIMIT 10
            """),
            {"q": f"%{q}%"},
        )
        href_map = {"admin": "/admin/e-content", "faculty": "/faculty/e-content"}
        href = href_map.get(role, "/student/e-content")
        return [
            SearchResultItem(
                id=str(r.id),
                type="econtent",
                title=r.title,
                subtitle=r.subject_name,
                badge=r.content_type,
                href=f"{href}/{r.id}",
                relevance=_score(r.title, r.subject_name or "", q),
            )
            for r in rows.fetchall()
        ]
    except Exception:
        return []


async def _search_facilities(q: str, db: AsyncSession) -> List[SearchResultItem]:
    try:
        rows = await db.execute(
            text("""
                SELECT id, name, facility_type, building, description
                FROM facilities
                WHERE name ILIKE :q OR facility_type ILIKE :q OR building ILIKE :q
                LIMIT 8
            """),
            {"q": f"%{q}%"},
        )
        return [
            SearchResultItem(
                id=str(r.id),
                type="facilities",
                title=r.name,
                subtitle=r.building,
                badge=r.facility_type,
                href="/student/facilities",
                relevance=_score(r.name, r.building or "", q),
            )
            for r in rows.fetchall()
        ]
    except Exception:
        return []


async def _search_policies(q: str, db: AsyncSession, role: str) -> List[SearchResultItem]:
    try:
        audience_filter = "" if role == "admin" else "AND (audience = 'all' OR audience = :role)"
        rows = await db.execute(
            text(f"""
                SELECT id, title, category, audience, status
                FROM policies
                WHERE (title ILIKE :q OR category ILIKE :q)
                  AND status = 'published'
                  {audience_filter}
                LIMIT 8
            """),
            {"q": f"%{q}%", "role": role},
        )
        return [
            SearchResultItem(
                id=str(r.id),
                type="policies",
                title=r.title,
                subtitle=r.category,
                badge=r.audience,
                href="/student/policies",
                relevance=_score(r.title, r.category or "", q),
            )
            for r in rows.fetchall()
        ]
    except Exception:
        return []


async def _search_alumni(q: str, db: AsyncSession, role: str) -> List[SearchResultItem]:
    try:
        # Never expose private alumni profiles to students
        privacy_filter = "AND profile_visibility = 'public'" if role not in ("admin",) else ""
        rows = await db.execute(
            text(f"""
                SELECT id, alumni_name, graduation_year::text, department, current_company
                FROM alumni_profiles
                WHERE (alumni_name ILIKE :q OR current_company ILIKE :q OR department ILIKE :q)
                  {privacy_filter}
                LIMIT 8
            """),
            {"q": f"%{q}%"},
        )
        return [
            SearchResultItem(
                id=str(r.id),
                type="alumni",
                title=r.alumni_name,
                subtitle=f"{r.department}, Batch {r.graduation_year}",
                badge=r.current_company,
                href="/student/alumni",
                relevance=_score(r.alumni_name, r.current_company or "", q),
            )
            for r in rows.fetchall()
        ]
    except Exception:
        return []


# ── Main Endpoint ─────────────────────────────────────────────────────────────

@router.get(
    "/search",
    response_model=SearchResponse,
    tags=["Global Search"],
    summary="Global 360 Search",
    description=(
        "Role-aware full-text search across events, e-content, facilities, policies, and alumni. "
        "Private/admin data is never exposed based on the requester's role."
    ),
)
async def global_search(
    q: str = Query(..., min_length=2, max_length=100, description="Search query string"),
    types: Optional[str] = Query(
        None,
        description="Comma-separated types to include: events,econtent,facilities,policies,alumni",
    ),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SearchResponse:
    import time
    start = time.monotonic()

    role = current_user.get("role", "student")
    requested = set(types.split(",")) if types else {"events", "courses", "econtent", "facilities", "policies", "alumni"}

    # Role-based type restrictions — students cannot search admin-only data
    if role == "student":
        requested -= {"admin_logs", "users", "sync_logs"}

    # Run parallel sub-searches
    tasks: List[Any] = []
    if "events" in requested:
        tasks.append(_search_events(q, db, role))
    if "courses" in requested:
        tasks.append(_search_courses(q, db))
    if "econtent" in requested:
        tasks.append(_search_econtent(q, db, role))
    if "facilities" in requested:
        tasks.append(_search_facilities(q, db))
    if "policies" in requested:
        tasks.append(_search_policies(q, db, role))
    if "alumni" in requested:
        tasks.append(_search_alumni(q, db, role))

    results_nested = await asyncio.gather(*tasks, return_exceptions=True)

    # Flatten, filter exceptions, sort by relevance, cap at 20
    all_results: List[SearchResultItem] = []
    for batch in results_nested:
        if isinstance(batch, list):
            all_results.extend(batch)

    all_results.sort(key=lambda r: r.relevance, reverse=True)
    all_results = all_results[:20]

    took_ms = int((time.monotonic() - start) * 1000)

    return SearchResponse(
        query=q,
        results=all_results,
        total=len(all_results),
        took_ms=took_ms,
    )
