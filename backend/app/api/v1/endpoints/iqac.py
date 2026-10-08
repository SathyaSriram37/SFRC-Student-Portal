"""
SFRC Internal Quality Assurance Cell (IQAC) Management API
Phase 13 / Phase 9: Fully persistent IQAC meetings, minutes, action items tracking, quality initiatives, feedback cycles, and AQAR annual documentation.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.audit import log_audit_event

router = APIRouter()

# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class ActionItemBase(BaseModel):
    title: str = Field(..., min_length=3)
    responsible_person_or_dept: str
    target_date: str
    status: str = "Pending"  # "Pending", "In Progress", "Completed", "Deferred"
    evidence_url: Optional[str] = None
    remarks: Optional[str] = None

class ActionItem(ActionItemBase):
    id: str
    meeting_id: Optional[str] = None
    created_at: str
    updated_at: str

class ActionItemCreate(ActionItemBase):
    meeting_id: Optional[str] = None

class ActionItemUpdate(BaseModel):
    status: str  # "Pending", "In Progress", "Completed", "Deferred"
    evidence_url: Optional[str] = None
    remarks: Optional[str] = None

class IQACMeetingCreate(BaseModel):
    title: str = Field(..., min_length=3)
    meeting_number: str  # e.g. "IQAC/2026/Q1"
    meeting_date: str
    venue: str = "IQAC Conference Room"
    attendees: List[str] = []
    agenda: List[str]
    minutes: Optional[str] = None
    decisions: List[str] = []

class IQACMeeting(IQACMeetingCreate):
    id: str
    action_items_count: int = 0
    created_at: str
    updated_at: str

class IQACMeetingUpdate(BaseModel):
    minutes: Optional[str] = None
    decisions: List[str] = []
    agenda: Optional[List[str]] = None

class QualityInitiativeCreate(BaseModel):
    title: str = Field(..., min_length=3)
    academic_year: str = "2025-2026"
    coordinator: str
    objectives: str
    target_kpi: str
    status: str = "Active"  # "Active", "Completed", "Planned"
    impact_metrics: Optional[str] = None

class QualityInitiative(QualityInitiativeCreate):
    id: str
    created_at: str

class FeedbackCycle(BaseModel):
    id: str
    academic_year: str
    cycle_name: str
    stakeholder_type: str  # "Students", "Faculty", "Alumni", "Employers", "Parents"
    start_date: str
    end_date: str
    total_responses: int
    satisfaction_rate: float
    status: str  # "Active", "Analyzed", "Closed"
    action_taken_report_url: Optional[str] = None

class AQARDocumentCreate(BaseModel):
    academic_year: str = "2024-2025"
    criteria_number: int = 1  # 1 to 7 NAAC criteria
    criteria_name: str
    file_title: str
    document_url: str
    submitted_to_naac: bool = True
    submission_date: str

class AQARDocument(AQARDocumentCreate):
    id: str
    created_at: str


# ── Deserialization Helpers ──────────────────────────────────────────────────

def parse_json_list(val: Any) -> List[Any]:
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            return [val] if val else []
    return []

def row_to_meeting(row: Dict[str, Any]) -> IQACMeeting:
    return IQACMeeting(
        id=str(row["id"]),
        title=row["title"],
        meeting_number=row["meeting_number"],
        meeting_date=str(row["meeting_date"]),
        venue=row.get("venue") or "IQAC Conference Room",
        attendees=parse_json_list(row.get("attendees")),
        agenda=parse_json_list(row.get("agenda")),
        minutes=row.get("minutes"),
        decisions=parse_json_list(row.get("decisions")),
        action_items_count=int(row.get("action_items_count") or 0),
        created_at=str(row.get("created_at") or ""),
        updated_at=str(row.get("updated_at") or ""),
    )

def row_to_action_item(row: Dict[str, Any]) -> ActionItem:
    return ActionItem(
        id=str(row["id"]),
        meeting_id=str(row["meeting_id"]) if row.get("meeting_id") else None,
        title=row["title"],
        responsible_person_or_dept=row["responsible_person_or_dept"],
        target_date=str(row["target_date"]),
        status=row.get("status") or "Pending",
        evidence_url=row.get("evidence_url"),
        remarks=row.get("remarks"),
        created_at=str(row.get("created_at") or ""),
        updated_at=str(row.get("updated_at") or ""),
    )

def row_to_initiative(row: Dict[str, Any]) -> QualityInitiative:
    return QualityInitiative(
        id=str(row["id"]),
        title=row["title"],
        academic_year=row.get("academic_year") or "2025-2026",
        coordinator=row["coordinator"],
        objectives=row["objectives"],
        target_kpi=row["target_kpi"],
        status=row.get("status") or "Active",
        impact_metrics=row.get("impact_metrics"),
        created_at=str(row.get("created_at") or ""),
    )

def row_to_feedback_cycle(row: Dict[str, Any]) -> FeedbackCycle:
    return FeedbackCycle(
        id=str(row["id"]),
        academic_year=row["academic_year"],
        cycle_name=row["cycle_name"],
        stakeholder_type=row["stakeholder_type"],
        start_date=str(row["start_date"]),
        end_date=str(row["end_date"]),
        total_responses=int(row.get("total_responses") or 0),
        satisfaction_rate=float(row.get("satisfaction_rate") or 0.0),
        status=row.get("status") or "Active",
        action_taken_report_url=row.get("action_taken_report_url"),
    )

def row_to_aqar(row: Dict[str, Any]) -> AQARDocument:
    sub = row.get("submitted_to_naac")
    return AQARDocument(
        id=str(row["id"]),
        academic_year=row["academic_year"],
        criteria_number=int(row["criteria_number"]),
        criteria_name=row["criteria_name"],
        file_title=row["file_title"],
        document_url=row["document_url"],
        submitted_to_naac=bool(sub) if sub is not None else True,
        submission_date=str(row["submission_date"]),
        created_at=str(row.get("created_at") or ""),
    )


# ── Role & Capability Security Helper ─────────────────────────────────────────

def require_iqac_admin(user: Dict[str, Any]) -> None:
    """Strictly enforces IQAC admin or management capability."""
    role = user.get("role", "student")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: IQAC management capability or administrator privileges required.",
        )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_iqac_dashboard(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get IQAC summary dashboard metrics computed directly from database tables.
    """
    require_iqac_admin(current_user)

    active_initiatives = (await db.execute(text("SELECT COUNT(*) FROM iqac_initiatives WHERE status = 'Active'"))).scalar() or 0
    pending_actions = (await db.execute(text("SELECT COUNT(*) FROM iqac_action_items WHERE status IN ('Pending', 'In Progress')"))).scalar() or 0
    completed_actions = (await db.execute(text("SELECT COUNT(*) FROM iqac_action_items WHERE status = 'Completed'"))).scalar() or 0
    total_actions = (await db.execute(text("SELECT COUNT(*) FROM iqac_action_items"))).scalar() or 0
    completion_rate = round((completed_actions / total_actions * 100), 1) if total_actions > 0 else 0.0

    total_meetings = (await db.execute(text("SELECT COUNT(*) FROM iqac_meetings"))).scalar() or 0
    feedback_cycles_count = (await db.execute(text("SELECT COUNT(*) FROM iqac_feedback_cycles"))).scalar() or 0
    aqar_documents_count = (await db.execute(text("SELECT COUNT(*) FROM iqac_aqar_documents"))).scalar() or 0

    return {
        "active_initiatives": active_initiatives,
        "pending_action_items": pending_actions,
        "completed_action_items": completed_actions,
        "action_item_completion_rate": completion_rate,
        "total_meetings": total_meetings,
        "feedback_cycles_count": feedback_cycles_count,
        "aqar_documents_count": aqar_documents_count,
    }


@router.get("/meetings", response_model=Dict[str, Any])
async def list_iqac_meetings(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Paginated list of official IQAC meetings and minutes from database.
    """
    require_iqac_admin(current_user)

    offset = (page - 1) * limit
    total = (await db.execute(text("SELECT COUNT(*) FROM iqac_meetings"))).scalar() or 0

    q = text("""
        SELECT * FROM iqac_meetings 
        ORDER BY meeting_date DESC 
        LIMIT :limit OFFSET :offset
    """)
    rows = (await db.execute(q, {"limit": limit, "offset": offset})).mappings().all()

    return {
        "items": [row_to_meeting(dict(r)) for r in rows],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.post("/meetings", response_model=IQACMeeting, status_code=status.HTTP_201_CREATED)
async def create_iqac_meeting(
    body: IQACMeetingCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Schedule an IQAC meeting with agenda and designated attendees in database.
    """
    require_iqac_admin(current_user)

    now_str = datetime.now(timezone.utc).isoformat()
    new_id = f"meet-{uuid.uuid4().hex[:8]}"

    insert_q = text("""
        INSERT INTO iqac_meetings (
            id, title, meeting_number, meeting_date, venue, attendees, agenda,
            minutes, decisions, action_items_count, created_at, updated_at
        ) VALUES (
            :id, :title, :meeting_number, :meeting_date, :venue, :attendees, :agenda,
            :minutes, :decisions, 0, :created_at, :updated_at
        )
    """)
    await db.execute(insert_q, {
        "id": new_id,
        "title": body.title,
        "meeting_number": body.meeting_number,
        "meeting_date": body.meeting_date,
        "venue": body.venue,
        "attendees": json.dumps(body.attendees),
        "agenda": json.dumps(body.agenda),
        "minutes": body.minutes,
        "decisions": json.dumps(body.decisions),
        "created_at": now_str,
        "updated_at": now_str,
    })

    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    await log_audit_event(
        user_id=user_id,
        action="create_iqac_meeting",
        resource_type="iqac_meetings",
        resource_id=new_id,
        details={"title": body.title, "meeting_number": body.meeting_number},
        db=db,
    )

    fetch_q = text("SELECT * FROM iqac_meetings WHERE id = :id")
    row = (await db.execute(fetch_q, {"id": new_id})).mappings().first()
    return row_to_meeting(dict(row))


@router.put("/meetings/{id}", response_model=IQACMeeting)
async def update_iqac_meeting_minutes(
    id: str,
    body: IQACMeetingUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update meeting minutes and official decisions in database.
    """
    require_iqac_admin(current_user)

    fetch_q = text("SELECT * FROM iqac_meetings WHERE id = :id")
    row = (await db.execute(fetch_q, {"id": id})).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="IQAC meeting record not found")

    now_str = datetime.now(timezone.utc).isoformat()
    minutes_val = body.minutes if body.minutes is not None else row.get("minutes")
    decisions_val = json.dumps(body.decisions) if body.decisions else row.get("decisions")
    agenda_val = json.dumps(body.agenda) if body.agenda is not None else row.get("agenda")

    update_q = text("""
        UPDATE iqac_meetings
        SET minutes = :minutes,
            decisions = :decisions,
            agenda = :agenda,
            updated_at = :updated_at
        WHERE id = :id
    """)
    await db.execute(update_q, {
        "id": id,
        "minutes": minutes_val,
        "decisions": decisions_val,
        "agenda": agenda_val,
        "updated_at": now_str,
    })

    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    await log_audit_event(
        user_id=user_id,
        action="update_iqac_meeting_minutes",
        resource_type="iqac_meetings",
        resource_id=id,
        details={"minutes_updated": body.minutes is not None},
        db=db,
    )

    updated_row = (await db.execute(fetch_q, {"id": id})).mappings().first()
    return row_to_meeting(dict(updated_row))


@router.get("/action-items", response_model=List[ActionItem])
async def list_iqac_action_items(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List IQAC action items from database with optional status filtering.
    """
    require_iqac_admin(current_user)

    if status_filter and status_filter != "all":
        q = text("SELECT * FROM iqac_action_items WHERE LOWER(status) = LOWER(:status) ORDER BY target_date ASC")
        rows = (await db.execute(q, {"status": status_filter})).mappings().all()
    else:
        q = text("SELECT * FROM iqac_action_items ORDER BY target_date ASC")
        rows = (await db.execute(q)).mappings().all()

    return [row_to_action_item(dict(r)) for r in rows]


@router.post("/action-items", response_model=ActionItem, status_code=status.HTTP_201_CREATED)
async def create_iqac_action_item(
    body: ActionItemCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new IQAC action item in database.
    """
    require_iqac_admin(current_user)

    now_str = datetime.now(timezone.utc).isoformat()
    new_id = f"act-{uuid.uuid4().hex[:8]}"

    insert_q = text("""
        INSERT INTO iqac_action_items (
            id, meeting_id, title, responsible_person_or_dept, target_date,
            status, evidence_url, remarks, created_at, updated_at
        ) VALUES (
            :id, :meeting_id, :title, :responsible_person_or_dept, :target_date,
            :status, :evidence_url, :remarks, :created_at, :updated_at
        )
    """)
    await db.execute(insert_q, {
        "id": new_id,
        "meeting_id": body.meeting_id,
        "title": body.title,
        "responsible_person_or_dept": body.responsible_person_or_dept,
        "target_date": body.target_date,
        "status": body.status,
        "evidence_url": body.evidence_url,
        "remarks": body.remarks,
        "created_at": now_str,
        "updated_at": now_str,
    })

    if body.meeting_id:
        await db.execute(
            text("UPDATE iqac_meetings SET action_items_count = action_items_count + 1 WHERE id = :mid"),
            {"mid": body.meeting_id},
        )

    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    await log_audit_event(
        user_id=user_id,
        action="create_iqac_action_item",
        resource_type="iqac_action_items",
        resource_id=new_id,
        details={"title": body.title, "target_date": body.target_date},
        db=db,
    )

    fetch_q = text("SELECT * FROM iqac_action_items WHERE id = :id")
    row = (await db.execute(fetch_q, {"id": new_id})).mappings().first()
    return row_to_action_item(dict(row))


@router.put("/action-items/{id}", response_model=ActionItem)
async def update_iqac_action_item(
    id: str,
    body: ActionItemUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update action item execution status and attach evidence URL in database.
    """
    require_iqac_admin(current_user)

    fetch_q = text("SELECT * FROM iqac_action_items WHERE id = :id")
    row = (await db.execute(fetch_q, {"id": id})).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="IQAC action item not found")

    now_str = datetime.now(timezone.utc).isoformat()
    evidence_val = body.evidence_url if body.evidence_url is not None else row.get("evidence_url")
    remarks_val = body.remarks if body.remarks is not None else row.get("remarks")

    update_q = text("""
        UPDATE iqac_action_items
        SET status = :status,
            evidence_url = :evidence_url,
            remarks = :remarks,
            updated_at = :updated_at
        WHERE id = :id
    """)
    await db.execute(update_q, {
        "id": id,
        "status": body.status,
        "evidence_url": evidence_val,
        "remarks": remarks_val,
        "updated_at": now_str,
    })

    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    await log_audit_event(
        user_id=user_id,
        action="update_iqac_action_item",
        resource_type="iqac_action_items",
        resource_id=id,
        details={"status": body.status},
        db=db,
    )

    updated_row = (await db.execute(fetch_q, {"id": id})).mappings().first()
    return row_to_action_item(dict(updated_row))


@router.get("/initiatives", response_model=List[QualityInitiative])
async def list_quality_initiatives(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List ongoing institutional quality initiatives from database.
    """
    require_iqac_admin(current_user)
    rows = (await db.execute(text("SELECT * FROM iqac_initiatives ORDER BY created_at DESC"))).mappings().all()
    return [row_to_initiative(dict(r)) for r in rows]


@router.post("/initiatives", response_model=QualityInitiative, status_code=status.HTTP_201_CREATED)
async def create_quality_initiative(
    body: QualityInitiativeCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new strategic quality enhancement initiative in database.
    """
    require_iqac_admin(current_user)

    now_str = datetime.now(timezone.utc).isoformat()
    new_id = f"init-{uuid.uuid4().hex[:8]}"

    insert_q = text("""
        INSERT INTO iqac_initiatives (
            id, title, academic_year, coordinator, objectives, target_kpi,
            status, impact_metrics, created_at
        ) VALUES (
            :id, :title, :academic_year, :coordinator, :objectives, :target_kpi,
            :status, :impact_metrics, :created_at
        )
    """)
    await db.execute(insert_q, {
        "id": new_id,
        "title": body.title,
        "academic_year": body.academic_year,
        "coordinator": body.coordinator,
        "objectives": body.objectives,
        "target_kpi": body.target_kpi,
        "status": body.status,
        "impact_metrics": body.impact_metrics,
        "created_at": now_str,
    })

    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    await log_audit_event(
        user_id=user_id,
        action="create_quality_initiative",
        resource_type="iqac_initiatives",
        resource_id=new_id,
        details={"title": body.title, "coordinator": body.coordinator},
        db=db,
    )

    fetch_q = text("SELECT * FROM iqac_initiatives WHERE id = :id")
    row = (await db.execute(fetch_q, {"id": new_id})).mappings().first()
    return row_to_initiative(dict(row))


@router.get("/feedback-cycles", response_model=List[FeedbackCycle])
async def list_feedback_cycles(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List stakeholder feedback cycles and satisfaction metrics from database.
    """
    require_iqac_admin(current_user)
    rows = (await db.execute(text("SELECT * FROM iqac_feedback_cycles ORDER BY start_date DESC"))).mappings().all()
    return [row_to_feedback_cycle(dict(r)) for r in rows]


@router.get("/aqar", response_model=List[AQARDocument])
async def list_aqar_documents(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List annual quality assurance reports (AQAR) submitted to NAAC from database.
    """
    require_iqac_admin(current_user)
    rows = (await db.execute(text("SELECT * FROM iqac_aqar_documents ORDER BY criteria_number ASC"))).mappings().all()
    return [row_to_aqar(dict(r)) for r in rows]


@router.post("/aqar", response_model=AQARDocument, status_code=status.HTTP_201_CREATED)
async def create_aqar_document(
    body: AQARDocumentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload and register AQAR criteria documentation in database.
    """
    require_iqac_admin(current_user)

    now_str = datetime.now(timezone.utc).isoformat()
    new_id = f"aqar-{uuid.uuid4().hex[:8]}"

    insert_q = text("""
        INSERT INTO iqac_aqar_documents (
            id, academic_year, criteria_number, criteria_name, file_title,
            document_url, submitted_to_naac, submission_date, created_at
        ) VALUES (
            :id, :academic_year, :criteria_number, :criteria_name, :file_title,
            :document_url, :submitted_to_naac, :submission_date, :created_at
        )
    """)
    await db.execute(insert_q, {
        "id": new_id,
        "academic_year": body.academic_year,
        "criteria_number": body.criteria_number,
        "criteria_name": body.criteria_name,
        "file_title": body.file_title,
        "document_url": body.document_url,
        "submitted_to_naac": 1 if body.submitted_to_naac else 0,
        "submission_date": body.submission_date,
        "created_at": now_str,
    })

    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    await log_audit_event(
        user_id=user_id,
        action="create_aqar_document",
        resource_type="iqac_aqar_documents",
        resource_id=new_id,
        details={"file_title": body.file_title, "criteria_number": body.criteria_number},
        db=db,
    )

    fetch_q = text("SELECT * FROM iqac_aqar_documents WHERE id = :id")
    row = (await db.execute(fetch_q, {"id": new_id})).mappings().first()
    return row_to_aqar(dict(row))
