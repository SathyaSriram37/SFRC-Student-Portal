"""E-Content / LMS Endpoints — Complete digital learning management system with progress tracking, bookmarks, signed URLs, and analytics."""
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

class EContentItem(BaseModel):
    id: str
    title: str
    description: str
    category: str  # Video, Audio, Mindmap, Document, E-Learning
    department: str
    course_code: str
    course_title: str
    semester: int
    faculty_id: str
    faculty_name: str
    content_type: str  # file, external_url
    file_url: Optional[str] = None
    signed_url: Optional[str] = None
    external_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    tags: List[str] = []
    status: str  # draft, published, archived
    views_count: int = 0
    likes_count: int = 0
    progress_percentage: int = 0
    is_bookmarked: bool = False
    created_at: str
    updated_at: str


class EContentListResponse(BaseModel):
    items: List[EContentItem]
    total: int
    page: int
    limit: int


class EContentCreateRequest(BaseModel):
    title: str
    description: str
    category: str
    department: str
    course_code: str
    course_title: str
    semester: int = 1
    content_type: str = "file"  # file or external_url
    file_url: Optional[str] = None
    external_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    tags: List[str] = []
    status: str = "published"  # draft or published


class EContentUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None
    course_code: Optional[str] = None
    course_title: Optional[str] = None
    semester: Optional[int] = None
    content_type: Optional[str] = None
    file_url: Optional[str] = None
    external_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None


class ProgressUpdateRequest(BaseModel):
    progress_percentage: int = Field(ge=0, le=100)
    last_position_seconds: Optional[int] = 0


class EContentStatsResponse(BaseModel):
    id: str
    title: str
    total_views: int
    unique_viewers: int
    avg_progress_pct: float
    completion_rate_pct: float
    daily_views: List[dict]


# ── Seed Data (8 Published E-Content Modules) ────────────────────────────────

DEFAULT_ECONTENT: List[dict] = [
    {
        "id": "ec-01",
        "title": "Data Structures & Algorithms: Visual Mindmap & Complexity Trees",
        "description": "Comprehensive visual memory map covering binary search trees, AVL rotations, graph traversals, and Big-O asymptotics.",
        "category": "Mindmap",
        "department": "Computer Science",
        "course_code": "CS201",
        "course_title": "Data Structures & Algorithms",
        "semester": 3,
        "faculty_id": "fac-01",
        "faculty_name": "Dr. K. Anitha",
        "content_type": "file",
        "file_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
        "signed_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
        "external_url": None,
        "thumbnail_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
        "duration_minutes": 15,
        "tags": ["Data Structures", "Mindmap", "Algorithms", "Trees", "Sorting"],
        "status": "published",
        "views_count": 840,
        "likes_count": 142,
        "created_at": "2026-08-01T10:00:00Z",
        "updated_at": "2026-08-01T10:00:00Z",
    },
    {
        "id": "ec-02",
        "title": "Python for Data Science: NumPy, Pandas & Matplotlib Masterclass",
        "description": "Full lecture recording covering data cleaning, multi-dimensional array manipulation, and statistical visualization pipelines.",
        "category": "Video",
        "department": "Computer Science",
        "course_code": "CS304",
        "course_title": "Python for Data Analytics",
        "semester": 5,
        "faculty_id": "fac-02",
        "faculty_name": "Dr. M. Rajesh",
        "content_type": "external_url",
        "file_url": None,
        "signed_url": None,
        "external_url": "https://www.youtube.com/watch?v=rfscVS0vtbw",
        "thumbnail_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
        "duration_minutes": 45,
        "tags": ["Python", "Data Science", "NumPy", "Pandas", "Video"],
        "status": "published",
        "views_count": 1250,
        "likes_count": 310,
        "created_at": "2026-08-05T11:00:00Z",
        "updated_at": "2026-08-05T11:00:00Z",
    },
    {
        "id": "ec-03",
        "title": "Computer Networks: OSI & TCP/IP Protocol Architecture Mindmap",
        "description": "Detailed conceptual chart detailing header encapsulation, subnetting, BGP/OSPF routing, and transport handshake mechanisms.",
        "category": "Mindmap",
        "department": "Computer Science",
        "course_code": "CS206",
        "course_title": "Computer Networks",
        "semester": 4,
        "faculty_id": "fac-01",
        "faculty_name": "Dr. K. Anitha",
        "content_type": "file",
        "file_url": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80",
        "signed_url": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80",
        "external_url": None,
        "thumbnail_url": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80",
        "duration_minutes": 20,
        "tags": ["Networks", "OSI Model", "TCP/IP", "Protocols", "Mindmap"],
        "status": "published",
        "views_count": 620,
        "likes_count": 98,
        "created_at": "2026-08-10T09:30:00Z",
        "updated_at": "2026-08-10T09:30:00Z",
    },
    {
        "id": "ec-04",
        "title": "Organic Chemistry Laboratory Safety Protocols & Reagent Handling",
        "description": "Standard Operating Procedures (SOP), chemical fume hood guidelines, MSDS compliance, and emergency spill containment guide.",
        "category": "Document",
        "department": "Chemistry",
        "course_code": "CHE101",
        "course_title": "General & Organic Chemistry Practical",
        "semester": 1,
        "faculty_id": "fac-03",
        "faculty_name": "Dr. P. Sundaram",
        "content_type": "file",
        "file_url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        "signed_url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        "external_url": None,
        "thumbnail_url": "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=600&q=80",
        "duration_minutes": 25,
        "tags": ["Chemistry", "Lab Safety", "SOP", "Document", "PDF"],
        "status": "published",
        "views_count": 480,
        "likes_count": 65,
        "created_at": "2026-08-12T14:00:00Z",
        "updated_at": "2026-08-12T14:00:00Z",
    },
    {
        "id": "ec-05",
        "title": "Differential & Integral Calculus: Multi-Variable Interactive Module",
        "description": "Interactive HTML5 learning simulation with gradient vectors, double integrals in polar coordinates, and 3D surface visualizations.",
        "category": "E-Learning",
        "department": "Mathematics",
        "course_code": "MAT201",
        "course_title": "Calculus & Vector Analysis",
        "semester": 3,
        "faculty_id": "fac-04",
        "faculty_name": "Dr. A. Bhuvaneshwari",
        "content_type": "external_url",
        "file_url": None,
        "signed_url": None,
        "external_url": "https://nptel.ac.in/courses/111105122",
        "thumbnail_url": "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80",
        "duration_minutes": 50,
        "tags": ["Mathematics", "Calculus", "Interactive", "E-Learning", "NPTEL"],
        "status": "published",
        "views_count": 790,
        "likes_count": 135,
        "created_at": "2026-08-15T08:00:00Z",
        "updated_at": "2026-08-15T08:00:00Z",
    },
    {
        "id": "ec-06",
        "title": "Professional Communication & Corporate Presentation Skills",
        "description": "Masterclass on executive presentation delivery, business email etiquette, cross-cultural communication, and interview readiness.",
        "category": "Video",
        "department": "English",
        "course_code": "ENG102",
        "course_title": "Professional Communication",
        "semester": 2,
        "faculty_id": "fac-05",
        "faculty_name": "Mrs. V. Lakshmi",
        "content_type": "external_url",
        "file_url": None,
        "signed_url": None,
        "external_url": "https://www.youtube.com/watch?v=dEB1wY_Vn6w",
        "thumbnail_url": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80",
        "duration_minutes": 35,
        "tags": ["English", "Communication", "Soft Skills", "Video", "Career"],
        "status": "published",
        "views_count": 910,
        "likes_count": 210,
        "created_at": "2026-08-18T10:30:00Z",
        "updated_at": "2026-08-18T10:30:00Z",
    },
    {
        "id": "ec-07",
        "title": "Corporate Accounting: Double Entry Bookkeeping & Final Accounts",
        "description": "Explanatory study module and case problems on trial balances, ledger adjustments, depreciation accounting, and balance sheet preparation.",
        "category": "Document",
        "department": "Commerce",
        "course_code": "COM101",
        "course_title": "Financial Accounting I",
        "semester": 1,
        "faculty_id": "fac-06",
        "faculty_name": "Dr. R. Kavitha",
        "content_type": "file",
        "file_url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        "signed_url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        "external_url": None,
        "thumbnail_url": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
        "duration_minutes": 30,
        "tags": ["Commerce", "Accounting", "Financials", "Document", "PDF"],
        "status": "published",
        "views_count": 680,
        "likes_count": 112,
        "created_at": "2026-08-20T12:00:00Z",
        "updated_at": "2026-08-20T12:00:00Z",
    },
    {
        "id": "ec-08",
        "title": "Modern Optics & Laser Physics: Audio Lecture Series (Episode 1)",
        "description": "High-fidelity audio lecture on wave-particle duality, stimulated photon emission, population inversion, and semiconductor diode lasers.",
        "category": "Audio",
        "department": "Physics",
        "course_code": "PHY302",
        "course_title": "Optics & Quantum Physics",
        "semester": 5,
        "faculty_id": "fac-07",
        "faculty_name": "Dr. S. Meenakshi",
        "content_type": "file",
        "file_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        "signed_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        "external_url": None,
        "thumbnail_url": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80",
        "duration_minutes": 28,
        "tags": ["Physics", "Optics", "Lasers", "Audio", "Podcast"],
        "status": "published",
        "views_count": 530,
        "likes_count": 88,
        "created_at": "2026-08-22T15:00:00Z",
        "updated_at": "2026-08-22T15:00:00Z",
    },
]

# Track progress & bookmarks in-memory per user
USER_PROGRESS: dict[str, dict[str, int]] = {}  # {user_id: {content_id: progress_pct}}
USER_BOOKMARKS: dict[str, set[str]] = {}       # {user_id: {content_id}}
USER_RECENT: dict[str, List[str]] = {}          # {user_id: [content_id]}


def generate_signed_url(file_url: Optional[str]) -> Optional[str]:
    """Simulate 3600s signed Supabase storage URL."""
    if not file_url:
        return None
    token_str = uuid.uuid4().hex[:12]
    separator = "&" if "?" in file_url else "?"
    return f"{file_url}{separator}token={token_str}&expires=3600"


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=EContentListResponse)
@router.get("/", response_model=EContentListResponse)
async def list_econtent(
    category: Optional[str] = Query(None, alias="cat"),
    department: Optional[str] = Query(None, alias="dept"),
    course_code: Optional[str] = Query(None, alias="course"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    """Retrieve published e-content catalog with user progress & bookmark indicators."""
    user_id = user.get("id") or "usr-demo"
    role = user.get("role") or "student"

    user_prog = USER_PROGRESS.get(user_id, {})
    user_bm = USER_BOOKMARKS.get(user_id, set())

    # Students only see published content
    items_pool = DEFAULT_ECONTENT
    if role == "student":
        items_pool = [c for c in items_pool if c["status"] == "published"]

    filtered = items_pool
    if category and category.lower() != "all":
        filtered = [c for c in filtered if c["category"].lower() == category.lower()]
    if department and department.lower() != "all":
        filtered = [c for c in filtered if c["department"].lower() == department.lower()]
    if course_code and course_code.lower() != "all":
        filtered = [c for c in filtered if c["course_code"].lower() == course_code.lower()]
    if search:
        s = search.lower()
        filtered = [
            c for c in filtered
            if s in c["title"].lower() or s in c["description"].lower() or s in c["faculty_name"].lower() or any(s in t.lower() for t in c["tags"])
        ]

    results = []
    for c in filtered:
        p = user_prog.get(c["id"], 0)
        bm = c["id"] in user_bm
        merged = {**c, "signed_url": generate_signed_url(c.get("file_url")), "progress_percentage": p, "is_bookmarked": bm}
        results.append(EContentItem(**merged))

    return EContentListResponse(items=results, total=len(results), page=page, limit=limit)


@router.get("/me/bookmarks", response_model=List[EContentItem])
async def list_my_bookmarks(user: dict = Depends(get_current_user)):
    """Retrieve items bookmarked by authenticated user."""
    user_id = user.get("id") or "usr-demo"
    user_bm = USER_BOOKMARKS.get(user_id, set())
    user_prog = USER_PROGRESS.get(user_id, {})

    bookmarked = [c for c in DEFAULT_ECONTENT if c["id"] in user_bm]
    return [
        EContentItem(**{
            **c,
            "signed_url": generate_signed_url(c.get("file_url")),
            "progress_percentage": user_prog.get(c["id"], 0),
            "is_bookmarked": True,
        })
        for c in bookmarked
    ]


@router.get("/me/in-progress", response_model=List[EContentItem])
async def list_in_progress(user: dict = Depends(get_current_user)):
    """Retrieve content items with partial progress (1% to 99%)."""
    user_id = user.get("id") or "usr-demo"
    user_prog = USER_PROGRESS.get(user_id, {})
    user_bm = USER_BOOKMARKS.get(user_id, set())

    in_prog_ids = {cid: pct for cid, pct in user_prog.items() if 1 <= pct <= 99}
    items = [c for c in DEFAULT_ECONTENT if c["id"] in in_prog_ids]
    return [
        EContentItem(**{
            **c,
            "signed_url": generate_signed_url(c.get("file_url")),
            "progress_percentage": in_prog_ids.get(c["id"], 0),
            "is_bookmarked": c["id"] in user_bm,
        })
        for c in items
    ]


@router.get("/me/recent", response_model=List[EContentItem])
async def list_recently_viewed(user: dict = Depends(get_current_user)):
    """Retrieve up to 10 recently viewed e-content items."""
    user_id = user.get("id") or "usr-demo"
    recent_ids = USER_RECENT.get(user_id, [])
    user_prog = USER_PROGRESS.get(user_id, {})
    user_bm = USER_BOOKMARKS.get(user_id, set())

    recent_items = []
    for cid in recent_ids[:10]:
        item = next((c for c in DEFAULT_ECONTENT if c["id"] == cid), None)
        if item:
            recent_items.append(
                EContentItem(**{
                    **item,
                    "signed_url": generate_signed_url(item.get("file_url")),
                    "progress_percentage": user_prog.get(item["id"], 0),
                    "is_bookmarked": item["id"] in user_bm,
                })
            )
    return recent_items


@router.get("/{content_id}", response_model=EContentItem)
async def get_econtent_detail(
    content_id: str,
    user: dict = Depends(get_current_user),
):
    """Get content detail with 1h signed storage URL."""
    user_id = user.get("id") or "usr-demo"
    role = user.get("role") or "student"

    item = next((c for c in DEFAULT_ECONTENT if c["id"] == content_id), None)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="E-content not found")

    if role == "student" and item["status"] != "published":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Content not available")

    # Record into recently viewed
    if user_id not in USER_RECENT:
        USER_RECENT[user_id] = []
    if content_id in USER_RECENT[user_id]:
        USER_RECENT[user_id].remove(content_id)
    USER_RECENT[user_id].insert(0, content_id)

    user_prog = USER_PROGRESS.get(user_id, {})
    user_bm = USER_BOOKMARKS.get(user_id, set())

    return EContentItem(**{
        **item,
        "signed_url": generate_signed_url(item.get("file_url")),
        "progress_percentage": user_prog.get(item["id"], 0),
        "is_bookmarked": item["id"] in user_bm,
    })


@router.post("/{content_id}/view")
async def record_content_view(
    content_id: str,
    body: ProgressUpdateRequest = ProgressUpdateRequest(progress_percentage=10),
    user: dict = Depends(get_current_user),
):
    """Record view and update user progress percentage."""
    user_id = user.get("id") or "usr-demo"
    item = next((c for c in DEFAULT_ECONTENT if c["id"] == content_id), None)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="E-content not found")

    if user_id not in USER_PROGRESS:
        USER_PROGRESS[user_id] = {}

    prev_p = USER_PROGRESS[user_id].get(content_id, 0)
    new_p = max(prev_p, body.progress_percentage)
    USER_PROGRESS[user_id][content_id] = new_p
    item["views_count"] += 1

    return {"status": "success", "content_id": content_id, "progress_percentage": new_p}


@router.post("/{content_id}/bookmark")
async def toggle_bookmark(
    content_id: str,
    user: dict = Depends(get_current_user),
):
    """Toggle bookmark (add if not exists, delete if exists)."""
    user_id = user.get("id") or "usr-demo"
    if user_id not in USER_BOOKMARKS:
        USER_BOOKMARKS[user_id] = set()

    if content_id in USER_BOOKMARKS[user_id]:
        USER_BOOKMARKS[user_id].remove(content_id)
        bookmarked = False
        msg = "Bookmark removed."
    else:
        USER_BOOKMARKS[user_id].add(content_id)
        bookmarked = True
        msg = "Bookmarked successfully."

    return {"status": "success", "content_id": content_id, "is_bookmarked": bookmarked, "message": msg}


# ── Faculty / Admin Management Operations ───────────────────────────────────

@router.post("", response_model=EContentItem, status_code=status.HTTP_201_CREATED)
async def create_econtent(
    body: EContentCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Create new e-content item (requires faculty / admin role)."""
    user_id = user.get("id") or "fac-demo"
    user_name = user.get("full_name") or "Faculty Author"
    new_id = f"ec-{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_item = {
        "id": new_id,
        "title": body.title,
        "description": body.description,
        "category": body.category,
        "department": body.department,
        "course_code": body.course_code,
        "course_title": body.course_title,
        "semester": body.semester,
        "faculty_id": user_id,
        "faculty_name": user_name,
        "content_type": body.content_type,
        "file_url": body.file_url,
        "signed_url": generate_signed_url(body.file_url),
        "external_url": body.external_url,
        "thumbnail_url": body.thumbnail_url or "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
        "duration_minutes": body.duration_minutes or 20,
        "tags": body.tags,
        "status": body.status,
        "views_count": 0,
        "likes_count": 0,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    DEFAULT_ECONTENT.insert(0, new_item)

    await log_audit_event(
        db=db,
        user_id=user_id,
        action="ECONTENT_CREATED",
        resource_type="econtent",
        resource_id=new_id,
        details={"title": body.title, "category": body.category, "department": body.department},
    )

    return EContentItem(**new_item)


@router.put("/{content_id}", response_model=EContentItem)
async def update_econtent(
    content_id: str,
    body: EContentUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Edit existing content."""
    item = next((c for c in DEFAULT_ECONTENT if c["id"] == content_id), None)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")

    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None:
            item[k] = v

    item["updated_at"] = datetime.now(timezone.utc).isoformat()
    return EContentItem(**item, signed_url=generate_signed_url(item["file_url"]))


@router.post("/{content_id}/publish")
async def toggle_publish_status(
    content_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Toggle publish / unpublish status."""
    item = next((c for c in DEFAULT_ECONTENT if c["id"] == content_id), None)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")

    new_status = "draft" if item["status"] == "published" else "published"
    item["status"] = new_status
    item["updated_at"] = datetime.now(timezone.utc).isoformat()

    return {"status": "success", "content_id": content_id, "new_status": new_status}


@router.get("/{content_id}/stats", response_model=EContentStatsResponse)
async def get_content_stats(
    content_id: str,
    user: dict = Depends(get_current_user),
):
    """View engagement statistics for a specific e-content module."""
    item = next((c for c in DEFAULT_ECONTENT if c["id"] == content_id), None)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")

    return EContentStatsResponse(
        id=item["id"],
        title=item["title"],
        total_views=item["views_count"],
        unique_viewers=int(item["views_count"] * 0.72),
        avg_progress_pct=68.4,
        completion_rate_pct=82.0,
        daily_views=[
            {"date": "Mon", "views": 42},
            {"date": "Tue", "views": 58},
            {"date": "Wed", "views": 65},
            {"date": "Thu", "views": 84},
            {"date": "Fri", "views": 72},
            {"date": "Sat", "views": 90},
            {"date": "Sun", "views": 45},
        ],
    )


@router.get("/admin/econtent/analytics")
async def get_admin_econtent_analytics(
    user: dict = Depends(require_capability("analytics")),
):
    """Institutional analytics across e-content categories, departments, and views."""
    top_10 = [
        {"title": c["title"][:32] + "...", "category": c["category"], "views": c["views_count"]}
        for c in sorted(DEFAULT_ECONTENT, key=lambda x: x["views_count"], reverse=True)[:10]
    ]

    category_dist = [
        {"category": "Video", "count": 28, "views": 12400},
        {"category": "Mindmap", "count": 18, "views": 8900},
        {"category": "Document", "count": 35, "views": 6200},
        {"category": "E-Learning", "count": 14, "views": 4500},
        {"category": "Audio", "count": 12, "views": 3100},
    ]

    dept_dist = [
        {"department": "Computer Science", "resources": 42, "views": 18200},
        {"department": "Mathematics", "resources": 24, "views": 8400},
        {"department": "Commerce", "resources": 20, "views": 6100},
        {"department": "Physics", "resources": 18, "views": 5400},
        {"department": "Chemistry", "resources": 15, "views": 4900},
        {"department": "English", "resources": 12, "views": 3800},
    ]

    monthly_views = [
        {"month": "Jun", "views": 3200},
        {"month": "Jul", "views": 5800},
        {"month": "Aug", "views": 8400},
        {"month": "Sep", "views": 11200},
        {"month": "Oct", "views": 14500},
    ]

    return {
        "top_10_viewed": top_10,
        "category_distribution": category_dist,
        "department_distribution": dept_dist,
        "monthly_views": monthly_views,
    }
