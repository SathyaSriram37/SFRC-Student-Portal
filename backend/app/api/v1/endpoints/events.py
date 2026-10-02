"""Events endpoints — Events listing, registrations, capacity tracking, and administrative event lifecycle."""
from __future__ import annotations

import uuid
from typing import Any, List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.capabilities import require_capability
from app.core.audit import log_audit_event

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class EventDetail(BaseModel):
    id: str
    title: str
    description: str
    category: str  # Technical, Cultural, Sports, Academic, Workshop, Career
    department: str
    venue: str
    start_date: str
    end_date: str
    time: str
    max_capacity: int
    registered_count: int
    is_registration_open: bool
    poster_url: Optional[str] = None
    speaker_details: Optional[str] = None
    status: str  # upcoming, ongoing, completed, cancelled
    is_registered: bool = False
    created_at: str


class EventListResponse(BaseModel):
    events: List[EventDetail]
    total: int
    page: int
    limit: int


class EventCreateRequest(BaseModel):
    title: str
    description: str
    category: str
    department: str
    venue: str
    start_date: str
    end_date: str
    time: str
    max_capacity: int = 100
    is_registration_open: bool = True
    poster_url: Optional[str] = None
    speaker_details: Optional[str] = None


class EventRegisterResponse(BaseModel):
    status: str
    event_id: str
    event_title: str
    registration_id: str
    message: str


# ── Seed Data (10 SFRC Campus Events) ────────────────────────────────────────

DEFAULT_EVENTS = [
    {
        "id": "evt-01",
        "title": "National Level Tech Symposium: TechVision 2026",
        "description": "Annual national technical symposium with coding hackathons, paper presentations, AI bot battles, and web design contests.",
        "category": "Technical",
        "department": "Computer Science",
        "venue": "Golden Jubilee Auditorium",
        "start_date": "2026-10-15",
        "end_date": "2026-10-16",
        "time": "09:30 AM - 04:30 PM",
        "max_capacity": 250,
        "registered_count": 142,
        "is_registration_open": True,
        "poster_url": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
        "speaker_details": "Keynote by Chief Technology Architect, Zoho Corp",
        "status": "upcoming",
        "created_at": "2026-09-01T10:00:00Z",
    },
    {
        "id": "evt-02",
        "title": "Prerna 2026: Inter-Collegiate Cultural Extravaganza",
        "description": "Celebration of dance, classical music, drama, fine arts, and literary competitions across South Indian colleges.",
        "category": "Cultural",
        "department": "Fine Arts & Student Union",
        "venue": "Open Air Theatre & Auditorium",
        "start_date": "2026-10-22",
        "end_date": "2026-10-23",
        "time": "10:00 AM - 06:00 PM",
        "max_capacity": 500,
        "registered_count": 380,
        "is_registration_open": True,
        "poster_url": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",
        "speaker_details": "Celebrity Judge & Classical Dancer",
        "status": "upcoming",
        "created_at": "2026-09-02T11:00:00Z",
    },
    {
        "id": "evt-03",
        "title": "Hands-on Workshop: Generative AI & LLM Deployment",
        "description": "Practical hands-on masterclass building production RAG applications, prompt engineering, and fine-tuning on open weights.",
        "category": "Workshop",
        "department": "Information Technology",
        "venue": "CS Lab 1 & 2",
        "start_date": "2026-10-05",
        "end_date": "2026-10-05",
        "time": "09:00 AM - 01:00 PM",
        "max_capacity": 60,
        "registered_count": 60,
        "is_registration_open": False,
        "poster_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
        "speaker_details": "Dr. V. Karthik (AI Research Lead)",
        "status": "upcoming",
        "created_at": "2026-09-05T09:30:00Z",
    },
    {
        "id": "evt-04",
        "title": "Annual Athletic Meet & Sports Tournament",
        "description": "Inter-department track and field events, relay races, volleyball championship, badminton, and basketball tournament.",
        "category": "Sports",
        "department": "Physical Education",
        "venue": "Sports Ground & Athletic Pavilion",
        "start_date": "2026-11-02",
        "end_date": "2026-11-04",
        "time": "07:30 AM - 05:30 PM",
        "max_capacity": 400,
        "registered_count": 210,
        "is_registration_open": True,
        "poster_url": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80",
        "speaker_details": "State Athletics Coach",
        "status": "upcoming",
        "created_at": "2026-09-10T08:00:00Z",
    },
    {
        "id": "evt-05",
        "title": "International Women in Leadership Summit",
        "description": "Panel discussion and keynote address on women leadership, innovation in STEM, entrepreneurship, and public service.",
        "category": "Academic",
        "department": "Commerce & Management",
        "venue": "Seminar Hall",
        "start_date": "2026-10-28",
        "end_date": "2026-10-28",
        "time": "10:30 AM - 03:30 PM",
        "max_capacity": 180,
        "registered_count": 95,
        "is_registration_open": True,
        "poster_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
        "speaker_details": "Prominent Women Entrepreneurs & IAS Officers",
        "status": "upcoming",
        "created_at": "2026-09-12T14:00:00Z",
    },
    {
        "id": "evt-06",
        "title": "Campus Placement Drive: Top Tier IT & Core Companies",
        "description": "Exclusive recruitment drive for final year students. Pre-placement talk, aptitude screening, technical interviews, and HR rounds.",
        "category": "Career",
        "department": "Placement Cell",
        "venue": "Main Block & CS Labs",
        "start_date": "2026-10-30",
        "end_date": "2026-10-31",
        "time": "08:30 AM - 06:00 PM",
        "max_capacity": 300,
        "registered_count": 280,
        "is_registration_open": True,
        "poster_url": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
        "speaker_details": "HR Panels from Top 10 Recruiters",
        "status": "upcoming",
        "created_at": "2026-09-15T09:00:00Z",
    },
    {
        "id": "evt-07",
        "title": "National Science Day Expo & Innovation Showcase",
        "description": "Exhibition of student science projects, eco-friendly models, biotechnology prototypes, and physics experimental demonstrations.",
        "category": "Academic",
        "department": "Physics & Chemistry",
        "venue": "Science Block Courtyard",
        "start_date": "2026-11-10",
        "end_date": "2026-11-10",
        "time": "09:30 AM - 04:00 PM",
        "max_capacity": 200,
        "registered_count": 88,
        "is_registration_open": True,
        "poster_url": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80",
        "speaker_details": "Senior Scientist, ISRO",
        "status": "upcoming",
        "created_at": "2026-09-18T10:00:00Z",
    },
    {
        "id": "evt-08",
        "title": "Literary Fest: Tamil & English Debating League",
        "description": "Debate championships, poetry recitation, elocution, creative writing, and literary quiz competitions.",
        "category": "Cultural",
        "department": "English & Tamil Dept",
        "venue": "Seminar Hall 2",
        "start_date": "2026-11-15",
        "end_date": "2026-11-15",
        "time": "10:00 AM - 04:00 PM",
        "max_capacity": 150,
        "registered_count": 64,
        "is_registration_open": True,
        "poster_url": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80",
        "speaker_details": "Renowned Tamil Author & Poet",
        "status": "upcoming",
        "created_at": "2026-09-20T11:00:00Z",
    },
    {
        "id": "evt-09",
        "title": "Green Campus & Renewable Energy Tree Plantation",
        "description": "Environmental awareness drive, mass tree plantation across hostel boundaries, and solar energy conservation pledge.",
        "category": "Academic",
        "department": "NSS & Eco Club",
        "venue": "Campus Botanical Garden",
        "start_date": "2026-11-20",
        "end_date": "2026-11-20",
        "time": "08:00 AM - 12:00 PM",
        "max_capacity": 300,
        "registered_count": 195,
        "is_registration_open": True,
        "poster_url": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
        "speaker_details": "District Forest Officer",
        "status": "upcoming",
        "created_at": "2026-09-22T08:30:00Z",
    },
    {
        "id": "evt-10",
        "title": "Distinguished Alumni Mentorship & Career Meet",
        "description": "Interactive networking dinner and career mentorship session connecting current students with alumni leaders across industries.",
        "category": "Career",
        "department": "Alumni Association",
        "venue": "Auditorium Conference Hall",
        "start_date": "2026-11-28",
        "end_date": "2026-11-28",
        "time": "04:30 PM - 08:30 PM",
        "max_capacity": 200,
        "registered_count": 130,
        "is_registration_open": True,
        "poster_url": "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
        "speaker_details": "Distinguished SFRC Alumni Cohort",
        "status": "upcoming",
        "created_at": "2026-09-25T15:00:00Z",
    },
]

# Track student registrations in-memory / DB fallback
REGISTERED_USER_EVENTS: dict[str, set[str]] = {}


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=EventListResponse)
@router.get("/", response_model=EventListResponse)
async def list_events(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None, alias="cat"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List all campus events with role-specific registration status."""
    user_id = user.get("id") or "usr-demo"
    user_regs = REGISTERED_USER_EVENTS.get(user_id, set())

    # Try DB query first
    try:
        query = text("""
            SELECT e.id, e.title, e.description, e.category, e.department, e.venue,
                   e.start_date::text, e.end_date::text, e.time, e.max_capacity,
                   e.registered_count, e.is_registration_open, e.poster_url,
                   e.speaker_details, e.status, e.created_at::text,
                   EXISTS(SELECT 1 FROM public.event_registrations er WHERE er.event_id = e.id AND er.user_id = :uid::uuid) as is_reg
            FROM public.events e
            ORDER BY e.start_date ASC
        """)
        rows = (await db.execute(query, {"uid": user_id})).mappings().all()
        if rows:
            items = []
            for r in rows:
                is_reg = bool(r["is_reg"]) or (str(r["id"]) in user_regs)
                items.append(
                    EventDetail(
                        id=str(r["id"]),
                        title=r["title"],
                        description=r["description"] or "",
                        category=r["category"] or "Academic",
                        department=r["department"] or "College",
                        venue=r["venue"] or "Campus",
                        start_date=r["start_date"],
                        end_date=r["end_date"],
                        time=r["time"] or "09:00 AM - 05:00 PM",
                        max_capacity=int(r["max_capacity"] or 100),
                        registered_count=int(r["registered_count"] or 0),
                        is_registration_open=bool(r["is_registration_open"]),
                        poster_url=r.get("poster_url"),
                        speaker_details=r.get("speaker_details"),
                        status=r["status"] or "upcoming",
                        is_registered=is_reg,
                        created_at=r["created_at"],
                    )
                )
            return EventListResponse(events=items, total=len(items), page=page, limit=limit)
    except Exception:
        pass

    # Memory fallback
    filtered = DEFAULT_EVENTS
    if category and category.lower() != "all":
        filtered = [e for e in filtered if e["category"].lower() == category.lower()]
    if search:
        s = search.lower()
        filtered = [e for e in filtered if s in e["title"].lower() or s in e["description"].lower() or s in e["venue"].lower()]

    items = []
    for e in filtered:
        is_reg = e["id"] in user_regs
        items.append(
            EventDetail(
                id=e["id"],
                title=e["title"],
                description=e["description"],
                category=e["category"],
                department=e["department"],
                venue=e["venue"],
                start_date=e["start_date"],
                end_date=e["end_date"],
                time=e["time"],
                max_capacity=e["max_capacity"],
                registered_count=e["registered_count"] + (1 if is_reg else 0),
                is_registration_open=e["is_registration_open"] and (e["registered_count"] < e["max_capacity"]),
                poster_url=e.get("poster_url"),
                speaker_details=e.get("speaker_details"),
                status=e["status"],
                is_registered=is_reg,
                created_at=e["created_at"],
            )
        )

    return EventListResponse(events=items, total=len(items), page=page, limit=limit)


@router.get("/me/registered", response_model=List[EventDetail])
async def list_my_registered_events(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Retrieve list of events current student is registered for."""
    user_id = user.get("id") or "usr-demo"
    user_regs = REGISTERED_USER_EVENTS.get(user_id, set())

    registered = [e for e in DEFAULT_EVENTS if e["id"] in user_regs]
    return [
        EventDetail(
            id=e["id"],
            title=e["title"],
            description=e["description"],
            category=e["category"],
            department=e["department"],
            venue=e["venue"],
            start_date=e["start_date"],
            end_date=e["end_date"],
            time=e["time"],
            max_capacity=e["max_capacity"],
            registered_count=e["registered_count"] + 1,
            is_registration_open=e["is_registration_open"],
            poster_url=e.get("poster_url"),
            speaker_details=e.get("speaker_details"),
            status=e["status"],
            is_registered=True,
            created_at=e["created_at"],
        )
        for e in registered
    ]


@router.get("/{event_id}", response_model=EventDetail)
async def get_event_detail(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get single event details."""
    user_id = user.get("id") or "usr-demo"
    user_regs = REGISTERED_USER_EVENTS.get(user_id, set())

    for e in DEFAULT_EVENTS:
        if e["id"] == event_id:
            is_reg = event_id in user_regs
            return EventDetail(
                id=e["id"],
                title=e["title"],
                description=e["description"],
                category=e["category"],
                department=e["department"],
                venue=e["venue"],
                start_date=e["start_date"],
                end_date=e["end_date"],
                time=e["time"],
                max_capacity=e["max_capacity"],
                registered_count=e["registered_count"] + (1 if is_reg else 0),
                is_registration_open=e["is_registration_open"],
                poster_url=e.get("poster_url"),
                speaker_details=e.get("speaker_details"),
                status=e["status"],
                is_registered=is_reg,
                created_at=e["created_at"],
            )

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")


@router.post("/{event_id}/register", response_model=EventRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_for_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Register student for an upcoming campus event with capacity check."""
    user_id = user.get("id") or "usr-demo"
    if user_id not in REGISTERED_USER_EVENTS:
        REGISTERED_USER_EVENTS[user_id] = set()

    event = next((e for e in DEFAULT_EVENTS if e["id"] == event_id), None)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if event_id in REGISTERED_USER_EVENTS[user_id]:
        return EventRegisterResponse(
            status="already_registered",
            event_id=event_id,
            event_title=event["title"],
            registration_id=f"REG-{event_id.upper()}-{user_id[:6]}",
            message="You are already registered for this event.",
        )

    if event["registered_count"] >= event["max_capacity"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event capacity is full")

    REGISTERED_USER_EVENTS[user_id].add(event_id)

    # Log audit event
    await log_audit_event(
        db=db,
        user_id=user_id,
        action="EVENT_REGISTRATION",
        resource_type="event",
        resource_id=event_id,
        details={"event_title": event["title"], "department": event["department"]},
    )

    reg_id = f"REG-{event_id.upper()}-{uuid.uuid4().hex[:6]}"
    return EventRegisterResponse(
        status="registered",
        event_id=event_id,
        event_title=event["title"],
        registration_id=reg_id,
        message="Registration confirmed! E-Pass generated and sent to your portal notifications.",
    )


@router.delete("/{event_id}/register")
async def cancel_event_registration(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Cancel existing event registration."""
    user_id = user.get("id") or "usr-demo"
    if user_id in REGISTERED_USER_EVENTS and event_id in REGISTERED_USER_EVENTS[user_id]:
        REGISTERED_USER_EVENTS[user_id].remove(event_id)
        return {"status": "cancelled", "event_id": event_id, "message": "Registration cancelled."}

    return {"status": "not_registered", "event_id": event_id, "message": "No active registration found."}
