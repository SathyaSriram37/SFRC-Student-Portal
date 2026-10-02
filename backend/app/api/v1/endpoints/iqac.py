"""
SFRC Internal Quality Assurance Cell (IQAC) Management API
Phase 13: IQAC meetings, minutes, action items tracking, quality initiatives, feedback cycles, and AQAR annual documentation.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.security import get_current_user

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

# ── Seed Data ─────────────────────────────────────────────────────────────────

SEED_MEETINGS: List[Dict[str, Any]] = [
    {
        "id": "meet-01",
        "title": "IQAC Statutory Meeting I — Curriculum Enrichment & OBE Review",
        "meeting_number": "IQAC/2026/M1",
        "meeting_date": "2026-06-15",
        "venue": "IQAC Board Room",
        "attendees": ["Dr. R. Sudha (Principal / Chairperson)", "Dr. S. Sivakama Sundari (IQAC Coordinator)", "Dr. R. Meenakshi (CS HOD)", "Dr. K. Arulmozhi (Chem)", "Mr. G. Sundar (Industry Expert)"],
        "agenda": ["Review of Outcome-Based Education (OBE) course attainment matrices for 2025-2026", "AI and Data Science curriculum integration across UG sciences", "Faculty development workshop on digital pedagogy"],
        "minutes": "The chairperson commended all departments for achieving 88% overall attainment target. Resolved to introduce 20% AI micro-modules across all discipline electives.",
        "decisions": ["Implement rubric-based continuous internal evaluation for all laboratory courses", "Sanction institutional seed grant of ₹5 Lakhs for student IoT prototypes"],
        "action_items_count": 2,
        "created_at": "2026-06-16T10:00:00Z",
        "updated_at": "2026-06-18T14:00:00Z",
    },
    {
        "id": "meet-02",
        "title": "IQAC Statutory Meeting II — NAAC SSR Criteria Assessment",
        "meeting_number": "IQAC/2026/M2",
        "meeting_date": "2026-08-20",
        "venue": "IQAC Board Room",
        "attendees": ["Dr. R. Sudha", "Dr. S. Sivakama Sundari", "Dr. P. Stella", "Dr. M. Deepalakshmi", "Ms. Ananya K. (Alumni Rep)"],
        "agenda": ["Review of NAAC Criterion 3 (Research, Innovations & Extension)", "Campus Care CivicFix SLA analytics compliance", "Green campus energy audit report presentation"],
        "minutes": "Evaluated the Scopus publication trajectory. Recommended establishing ACIDE student entrepreneurship demo day in October.",
        "decisions": ["Approve annual energy audit contract with certified BEE auditor", "Mandate all PG scholars to register for at least 1 Swayam/NPTEL MOOC"],
        "action_items_count": 2,
        "created_at": "2026-08-21T11:30:00Z",
        "updated_at": "2026-08-22T09:00:00Z",
    },
    {
        "id": "meet-03",
        "title": "IQAC Statutory Meeting III — Student Satisfaction Survey & Infrastructure",
        "meeting_number": "IQAC/2026/M3",
        "meeting_date": "2026-09-10",
        "venue": "IQAC Board Room",
        "attendees": ["Dr. R. Sudha", "Dr. S. Sivakama Sundari", "Dr. K. Chitra", "Dr. G. Uma Maheswari", "Dr. V. Gomathi"],
        "agenda": ["Analysis of Student Satisfaction Survey (SSS) responses", "Expansion of high-bandwidth Wi-Fi access in women hostel blocks", "YWED vocational training certifications review"],
        "minutes": "Student satisfaction scored 92.4% across teaching quality and library facilities. Hostel Wi-Fi upgrade approved.",
        "decisions": ["Authorize high-speed fiber backbone expansion for Block C and D", "Launch 5 new short-term YWED crafts courses for rural artisans"],
        "action_items_count": 1,
        "created_at": "2026-09-11T14:00:00Z",
        "updated_at": "2026-09-12T16:00:00Z",
    },
]

# 5 Action Items (2 completed, 3 pending/in progress)
SEED_ACTION_ITEMS: List[Dict[str, Any]] = [
    {
        "id": "act-01",
        "meeting_id": "meet-01",
        "title": "Formulate 20% AI & Data Literacy micro-syllabus for all UG Science majors",
        "responsible_person_or_dept": "Dean of Academic Affairs & CS Board of Studies",
        "target_date": "2026-07-30",
        "status": "Completed",
        "evidence_url": "https://sfrc.edu.in/iqac/evidence/BOS_AI_Curriculum_2026.pdf",
        "remarks": "Approved by Academic Council on July 28, 2026.",
        "created_at": "2026-06-16T10:00:00Z",
        "updated_at": "2026-07-29T11:00:00Z",
    },
    {
        "id": "act-02",
        "meeting_id": "meet-01",
        "title": "Conduct Faculty Development Workshop on Digital Assessment & Question Banks",
        "responsible_person_or_dept": "Dr. S. Sivakama Sundari (IQAC)",
        "target_date": "2026-08-10",
        "status": "Completed",
        "evidence_url": "https://sfrc.edu.in/iqac/evidence/FDP_Digital_Pedagogy_Report.pdf",
        "remarks": "128 faculty members attended and certified.",
        "created_at": "2026-06-16T10:00:00Z",
        "updated_at": "2026-08-11T15:30:00Z",
    },
    {
        "id": "act-03",
        "meeting_id": "meet-02",
        "title": "Establish Atal Community Innovation (ACIDE) startup demo kiosk in main foyer",
        "responsible_person_or_dept": "IEDC / ACIDE Cell Coordinators",
        "target_date": "2026-10-15",
        "status": "In Progress",
        "evidence_url": None,
        "remarks": "Structural design finalized; 7 student startups ready with products.",
        "created_at": "2026-08-21T11:30:00Z",
        "updated_at": "2026-09-20T10:00:00Z",
    },
    {
        "id": "act-04",
        "meeting_id": "meet-02",
        "title": "Conduct Green Energy & Carbon Footprint Audit with BEE Accredited Auditor",
        "responsible_person_or_dept": "Department of Physics & Environmental Club",
        "target_date": "2026-11-01",
        "status": "In Progress",
        "evidence_url": None,
        "remarks": "Field data collection underway across solar rooftops and water recharge pits.",
        "created_at": "2026-08-21T11:30:00Z",
        "updated_at": "2026-09-25T12:00:00Z",
    },
    {
        "id": "act-05",
        "meeting_id": "meet-03",
        "title": "Upgrade Gigabit Wi-Fi Access Points in Hostels Block C and D",
        "responsible_person_or_dept": "Campus Network & IT Systems Team",
        "target_date": "2026-10-30",
        "status": "Pending",
        "evidence_url": None,
        "remarks": "Hardware quotation approved; installation scheduled for next week.",
        "created_at": "2026-09-11T14:00:00Z",
        "updated_at": "2026-09-11T14:00:00Z",
    },
]

# 2 Quality Initiatives
SEED_INITIATIVES: List[Dict[str, Any]] = [
    {
        "id": "init-01",
        "title": "Project Pragya — AI-Powered Autonomous Learning & Personalized Mentoring",
        "academic_year": "2025-2026",
        "coordinator": "Dr. R. Meenakshi & Dr. S. Sivakama Sundari",
        "objectives": "Deploy localized LLM agents to deliver 24/7 syllabus tutoring, CIA marks analytics, and early shortage alerts.",
        "target_kpi": "100% student adoption with >= 85% attendance attainment across all departments.",
        "status": "Active",
        "impact_metrics": "Reduced academic grievance resolution time by 60% and increased CIA pass rate to 96.2%.",
        "created_at": "2025-07-01T09:00:00Z",
    },
    {
        "id": "init-02",
        "title": "EmpowHer Rural Skills — YWED Micro-Enterprise Incubator",
        "academic_year": "2025-2026",
        "coordinator": "Dr. G. Uma Maheswari",
        "objectives": "Provide hands-on vocational certifications in traditional handloom, bio-cosmetics, and eco-jute products for economic independence.",
        "target_kpi": "Certify 500+ women students annually with minimum 5 campus revenue startups.",
        "status": "Active",
        "impact_metrics": "7 thriving startups incubated under ACIDE with over ₹8.5 Lakhs generated in campus craft sales.",
        "created_at": "2025-07-15T10:00:00Z",
    },
]

# Feedback Cycles
SEED_FEEDBACK_CYCLES: List[Dict[str, Any]] = [
    {
        "id": "fb-01",
        "academic_year": "2025-2026",
        "cycle_name": "Mid-Term Student Satisfaction Survey (SSS)",
        "stakeholder_type": "Students",
        "start_date": "2026-08-01",
        "end_date": "2026-08-20",
        "total_responses": 2840,
        "satisfaction_rate": 92.4,
        "status": "Analyzed",
        "action_taken_report_url": "https://sfrc.edu.in/iqac/feedback/SSS_ATR_2026.pdf",
    },
    {
        "id": "fb-02",
        "academic_year": "2025-2026",
        "cycle_name": "Annual Alumni Curriculum Feedback & Industry Readiness",
        "stakeholder_type": "Alumni",
        "start_date": "2026-09-01",
        "end_date": "2026-09-30",
        "total_responses": 612,
        "satisfaction_rate": 94.8,
        "status": "Active",
        "action_taken_report_url": None,
    },
]

# 1 AQAR Document
SEED_AQAR: List[Dict[str, Any]] = [
    {
        "id": "aqar-01",
        "academic_year": "2024-2025",
        "criteria_number": 1,
        "criteria_name": "Curricular Aspects (Criterion I)",
        "file_title": "SFRC_AQAR_2024-25_Criterion_I_Curricular_Enrichment.pdf",
        "document_url": "https://sfrc.edu.in/iqac/aqar/2024-25/Criterion_1_Curricular.pdf",
        "submitted_to_naac": True,
        "submission_date": "2025-12-18",
        "created_at": "2025-12-19T10:00:00Z",
    }
]

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
):
    """
    Get IQAC summary dashboard metrics.
    """
    require_iqac_admin(current_user)

    active_initiatives = sum(1 for i in SEED_INITIATIVES if i["status"] == "Active")
    pending_actions = sum(1 for a in SEED_ACTION_ITEMS if a["status"] in ["Pending", "In Progress"])
    completed_actions = sum(1 for a in SEED_ACTION_ITEMS if a["status"] == "Completed")
    total_actions = len(SEED_ACTION_ITEMS)
    completion_rate = round((completed_actions / total_actions * 100), 1) if total_actions > 0 else 0.0

    return {
        "active_initiatives": active_initiatives,
        "pending_action_items": pending_actions,
        "completed_action_items": completed_actions,
        "action_item_completion_rate": completion_rate,
        "total_meetings": len(SEED_MEETINGS),
        "feedback_cycles_count": len(SEED_FEEDBACK_CYCLES),
        "aqar_documents_count": len(SEED_AQAR),
    }

@router.get("/meetings", response_model=Dict[str, Any])
async def list_iqac_meetings(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Paginated list of official IQAC meetings and minutes.
    """
    require_iqac_admin(current_user)

    offset = (page - 1) * limit
    paginated = SEED_MEETINGS[offset : offset + limit]

    return {
        "items": [IQACMeeting(**m) for m in paginated],
        "total": len(SEED_MEETINGS),
        "page": page,
        "limit": limit,
    }

@router.post("/meetings", response_model=IQACMeeting, status_code=status.HTTP_201_CREATED)
async def create_iqac_meeting(
    body: IQACMeetingCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Schedule an IQAC meeting with agenda and designated attendees.
    """
    require_iqac_admin(current_user)

    now_str = datetime.now(timezone.utc).isoformat()
    new_meeting = {
        "id": f"meet-{uuid.uuid4().hex[:8]}",
        **body.model_dump(),
        "action_items_count": 0,
        "created_at": now_str,
        "updated_at": now_str,
    }

    SEED_MEETINGS.insert(0, new_meeting)
    return IQACMeeting(**new_meeting)

@router.put("/meetings/{id}", response_model=IQACMeeting)
async def update_iqac_meeting_minutes(
    id: str,
    body: IQACMeetingUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Update meeting minutes and official decisions.
    """
    require_iqac_admin(current_user)

    meeting = next((m for m in SEED_MEETINGS if m["id"] == id), None)
    if not meeting:
        raise HTTPException(status_code=404, detail="IQAC meeting record not found")

    if body.minutes is not None:
        meeting["minutes"] = body.minutes
    if body.decisions:
        meeting["decisions"] = body.decisions
    if body.agenda:
        meeting["agenda"] = body.agenda

    meeting["updated_at"] = datetime.now(timezone.utc).isoformat()
    return IQACMeeting(**meeting)

@router.get("/action-items", response_model=List[ActionItem])
async def list_iqac_action_items(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    List IQAC action items with optional status filtering.
    """
    require_iqac_admin(current_user)

    results = SEED_ACTION_ITEMS
    if status_filter and status_filter != "all":
        results = [a for a in results if a["status"].lower() == status_filter.lower()]

    return [ActionItem(**a) for a in results]

@router.put("/action-items/{id}", response_model=ActionItem)
async def update_iqac_action_item(
    id: str,
    body: ActionItemUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Update action item execution status and attach evidence URL.
    """
    require_iqac_admin(current_user)

    action = next((a for a in SEED_ACTION_ITEMS if a["id"] == id), None)
    if not action:
        raise HTTPException(status_code=404, detail="IQAC action item not found")

    action["status"] = body.status
    if body.evidence_url is not None:
        action["evidence_url"] = body.evidence_url
    if body.remarks is not None:
        action["remarks"] = body.remarks
    action["updated_at"] = datetime.now(timezone.utc).isoformat()

    return ActionItem(**action)

@router.get("/initiatives", response_model=List[QualityInitiative])
async def list_quality_initiatives(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    List ongoing institutional quality initiatives.
    """
    require_iqac_admin(current_user)
    return [QualityInitiative(**i) for i in SEED_INITIATIVES]

@router.post("/initiatives", response_model=QualityInitiative, status_code=status.HTTP_201_CREATED)
async def create_quality_initiative(
    body: QualityInitiativeCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Register a new strategic quality enhancement initiative.
    """
    require_iqac_admin(current_user)

    now_str = datetime.now(timezone.utc).isoformat()
    new_init = {
        "id": f"init-{uuid.uuid4().hex[:8]}",
        **body.model_dump(),
        "created_at": now_str,
    }

    SEED_INITIATIVES.insert(0, new_init)
    return QualityInitiative(**new_init)

@router.get("/feedback-cycles", response_model=List[FeedbackCycle])
async def list_feedback_cycles(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    List stakeholder feedback cycles and satisfaction metrics.
    """
    require_iqac_admin(current_user)
    return [FeedbackCycle(**f) for f in SEED_FEEDBACK_CYCLES]

@router.get("/aqar", response_model=List[AQARDocument])
async def list_aqar_documents(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    List annual quality assurance reports (AQAR) submitted to NAAC.
    """
    require_iqac_admin(current_user)
    return [AQARDocument(**a) for a in SEED_AQAR]

@router.post("/aqar", response_model=AQARDocument, status_code=status.HTTP_201_CREATED)
async def create_aqar_document(
    body: AQARDocumentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Upload and register AQAR criteria documentation.
    """
    require_iqac_admin(current_user)

    now_str = datetime.now(timezone.utc).isoformat()
    new_aqar = {
        "id": f"aqar-{uuid.uuid4().hex[:8]}",
        **body.model_dump(),
        "created_at": now_str,
    }

    SEED_AQAR.insert(0, new_aqar)
    return AQARDocument(**new_aqar)
