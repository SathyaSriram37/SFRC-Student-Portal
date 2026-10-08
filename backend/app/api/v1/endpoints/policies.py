"""
SFRC Policies & Compliance Center API (Phase 14)
Statutory policies, code of conduct, automated acknowledgements, grievance redressal workflow, and administrative compliance.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.audit import log_audit_event

router = APIRouter()

# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class PolicyBase(BaseModel):
    title: str = Field(..., min_length=3, description="Policy title")
    category: str = Field(..., description="Policy category")
    version: str = Field(default="1.0", description="Semantic version string")
    audience: str = Field(default="all", description="Target audience: all | student | faculty | parent")
    requires_acknowledgement: bool = Field(default=False, description="Whether users must acknowledge this policy")
    effective_date: str = Field(default="2026-06-01", description="Effective date (YYYY-MM-DD)")
    description: str = Field(..., min_length=10, description="Short summary of the policy")
    content: str = Field(..., min_length=20, description="Full policy text/terms")
    document_url: Optional[str] = Field(None, description="Signed document / PDF link")

class PolicyCreate(PolicyBase):
    status: str = Field(default="draft", description="draft | published")

class PolicyUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    version: Optional[str] = None
    audience: Optional[str] = None
    requires_acknowledgement: Optional[bool] = None
    effective_date: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    document_url: Optional[str] = None
    status: Optional[str] = None

class PolicyItem(PolicyBase):
    id: str
    status: str  # "draft" | "published"
    created_at: str
    updated_at: str
    is_acknowledged: Optional[bool] = False
    acknowledged_at: Optional[str] = None
    total_acknowledgements: Optional[int] = None
    total_eligible_users: Optional[int] = None

class PolicyAcknowledgeResponse(BaseModel):
    acknowledged: bool
    policy_id: str
    policy_title: str
    version: str
    acknowledged_at: str
    message: str

class GrievanceCreate(BaseModel):
    category: str = Field(..., description="Academic | Infrastructure | Administrative | Staff | Ragging | Other")
    subject: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=50, description="Detailed grievance description (minimum 50 characters)")
    is_anonymous: bool = Field(default=False, description="Hide student identity in administrative dashboards")

class GrievanceStatusUpdate(BaseModel):
    status: str = Field(..., description="Received | Under Review | Resolved | Closed")
    admin_response_notes: str = Field(..., min_length=5, description="Administrative resolution or progress remarks")

class GrievanceItem(BaseModel):
    id: str
    reference: str
    category: str
    subject: str
    description: str
    is_anonymous: bool
    status: str
    reporter_id: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None
    admin_response_notes: Optional[str] = None
    created_at: str
    updated_at: str
    resolved_at: Optional[str] = None


# ── Database State & Seed Data ───────────────────────────────────────────────

DB_POLICIES: List[Dict[str, Any]] = [
    {
        "id": "pol-001",
        "title": "Anti-Ragging & Campus Discipline Policy",
        "category": "Anti-Ragging",
        "version": "1.0",
        "status": "published",
        "audience": "all",
        "requires_acknowledgement": True,
        "effective_date": "2026-06-01",
        "description": "Zero-tolerance statutory policy against ragging in academic premises, hostels, and digital spaces as per UGC Regulations and SFRC directives.",
        "content": "As per SFRC official policy. Refer official document. [Demo placeholder] The Standard Fireworks Rajaratnam College for Women enforces strict zero tolerance towards ragging in any form. Under the Tamil Nadu Prohibition of Ragging Act, offenders face immediate suspension, FIR registration, and academic debarment.",
        "document_url": "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80",
        "created_at": "2026-05-15T09:00:00Z",
        "updated_at": "2026-06-01T00:00:00Z",
    },
    {
        "id": "pol-002",
        "title": "IT Usage, Network Security & AI Ethics Policy",
        "category": "IT Policy",
        "version": "2.0",
        "status": "published",
        "audience": "all",
        "requires_acknowledgement": True,
        "effective_date": "2026-06-01",
        "description": "Guidelines for campus WiFi access, computing laboratories, cloud resources, student portal security, and responsible AI usage.",
        "content": "As per SFRC official policy. Refer official document. [Demo placeholder] Governs access to college IT infrastructure, mandatory multi-factor authentication, ethical principles for AI assistance in coursework, and strict prohibitions on credential sharing or unauthorized network monitoring.",
        "document_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
        "created_at": "2026-05-20T10:00:00Z",
        "updated_at": "2026-06-01T00:00:00Z",
    },
    {
        "id": "pol-003",
        "title": "Autonomous End-Semester Examination & CIA Regulations",
        "category": "Examination Rules",
        "version": "1.0",
        "status": "published",
        "audience": "student",
        "requires_acknowledgement": False,
        "effective_date": "2026-06-01",
        "description": "Examination conduct, continuous internal assessment (CIA) scoring rubrics, minimum 75% attendance threshold, and revaluation procedures.",
        "content": "As per SFRC official policy. Refer official document. [Demo placeholder] Specifies autonomous curriculum evaluation rules, compulsory 75% attendance for hall ticket issuance, malpractices protocols, and COE timeline for supplementary and improvement examinations.",
        "document_url": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
        "created_at": "2026-05-25T11:00:00Z",
        "updated_at": "2026-06-01T00:00:00Z",
    },
    {
        "id": "pol-004",
        "title": "Hostel Resident Code, Leave Workflow & Safety Guidelines",
        "category": "Hostel Rules",
        "version": "1.0",
        "status": "published",
        "audience": "student",
        "requires_acknowledgement": False,
        "effective_date": "2026-06-01",
        "description": "Hostel curfew hours, digital outpass workflows, warden verification, dining cleanliness, and residential safety standards.",
        "content": "As per SFRC official policy. Refer official document. [Demo placeholder] Mandatory evening roll call at 6:30 PM, electronic leave requests signed by guardians, strict prohibition of non-residents inside rooms, and hygienic code for shared amenities.",
        "document_url": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80",
        "created_at": "2026-05-28T14:00:00Z",
        "updated_at": "2026-06-01T00:00:00Z",
    },
    {
        "id": "pol-005",
        "title": "Central Library & Digital Repository Policy",
        "category": "Library Rules",
        "version": "1.0",
        "status": "draft",
        "audience": "all",
        "requires_acknowledgement": False,
        "effective_date": "2026-07-01",
        "description": "Borrowing limits, remote DELNET & N-LIST credentials, overdue fine schedules, and archival reproduction guidelines.",
        "content": "As per SFRC official policy. Refer official document. [Demo placeholder] Draft version currently undergoing annual review by the Library Committee before autonomous Governing Body renewal.",
        "document_url": "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
        "created_at": "2026-06-10T09:00:00Z",
        "updated_at": "2026-06-10T09:00:00Z",
    },
    {
        "id": "pol-006",
        "title": "Institutional Code of Conduct & Professional Ethics",
        "category": "Code of Conduct",
        "version": "1.0",
        "status": "draft",
        "audience": "all",
        "requires_acknowledgement": True,
        "effective_date": "2026-07-01",
        "description": "Standard code of integrity, ethics, intellectual property rights, and community standards for all institutional stakeholders.",
        "content": "As per SFRC official policy. Refer official document. [Demo placeholder] Draft version under IQAC and Academic Council review for the upcoming academic cycle.",
        "document_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80",
        "created_at": "2026-06-12T11:00:00Z",
        "updated_at": "2026-06-12T11:00:00Z",
    },
]

# Acknowledgements storage
DB_POLICY_ACKS: List[Dict[str, Any]] = [
    {
        "id": "ack-001",
        "policy_id": "pol-001",
        "user_id": "demo-other-student",
        "user_name": "Kavitha M",
        "version": "1.0",
        "acknowledged_at": "2026-06-05T10:00:00Z",
        "ip_address": "192.168.1.25",
    },
    {
        "id": "ack-002",
        "policy_id": "pol-002",
        "user_id": "demo-other-student",
        "user_name": "Kavitha M",
        "version": "2.0",
        "acknowledged_at": "2026-06-05T10:05:00Z",
        "ip_address": "192.168.1.25",
    },
]

# Grievance Storage
DB_GRIEVANCES: List[Dict[str, Any]] = [
    {
        "id": "grv-001",
        "reference": "GRV-00001",
        "category": "Infrastructure",
        "subject": "Lab 3 Air Conditioning and Power Socket Maintenance",
        "description": "During afternoon practical sessions in Computer Lab 3, several power sockets at terminal rows 4 and 5 trip intermittently, causing systems to reboot during database compilation. Requesting prompt inspection.",
        "is_anonymous": False,
        "status": "Under Review",
        "reporter_id": "00000000-0000-0000-0000-000000000001",
        "reporter_name": "Priyadharshini S",
        "reporter_email": "priya.s@sfrc.ac.in",
        "admin_response_notes": "Campus electrical team notified. Phase inspection scheduled for Saturday afternoon.",
        "created_at": "2026-09-20T11:30:00Z",
        "updated_at": "2026-09-21T09:00:00Z",
        "resolved_at": None,
    }
]

grievance_counter = 1


# ── Policy Endpoints (User/Student Facing) ───────────────────────────────────

@router.get("/policies", response_model=Dict[str, Any], tags=["Policies & Compliance"])
async def get_policies(
    cat: Optional[str] = Query(None, description="Filter by category"),
    audience: Optional[str] = Query(None, description="Filter by audience"),
    current_user: dict = Depends(get_current_user),
):
    """
    Get published policies filtered by role and optional category.
    Users only see published policies suitable for their audience.
    """
    user_role = current_user.get("role", "student")
    user_id = current_user.get("id")

    user_acks = {
        ack["policy_id"]: ack["acknowledged_at"]
        for ack in DB_POLICY_ACKS
        if ack.get("user_id") == user_id
    }

    filtered: List[Dict[str, Any]] = []
    for p in DB_POLICIES:
        # Non-admins only see published policies
        if user_role != "admin" and p["status"] != "published":
            continue

        # Audience check: 'all' matches everyone, otherwise match user's role
        if user_role != "admin" and p["audience"] != "all" and p["audience"] != user_role:
            continue

        if cat and cat != "all" and p["category"].lower() != cat.lower():
            continue

        if audience and audience != "all" and p["audience"].lower() != audience.lower():
            continue

        ack_time = user_acks.get(p["id"])
        item = {
            **p,
            "is_acknowledged": ack_time is not None,
            "acknowledged_at": ack_time,
        }
        filtered.append(item)

    return {
        "policies": filtered,
        "total": len(filtered),
    }


@router.get("/policies/me/pending", response_model=Dict[str, Any], tags=["Policies & Compliance"])
async def get_pending_policies(current_user: dict = Depends(get_current_user)):
    """
    Get policies requiring acknowledgement that the current user has not yet acknowledged.
    """
    user_role = current_user.get("role", "student")
    user_id = current_user.get("id")

    user_acked_policy_ids = {
        ack["policy_id"]
        for ack in DB_POLICY_ACKS
        if ack.get("user_id") == user_id
    }

    pending: List[Dict[str, Any]] = []
    for p in DB_POLICIES:
        if p["status"] != "published":
            continue
        if not p.get("requires_acknowledgement", False):
            continue
        if user_role != "admin" and p["audience"] != "all" and p["audience"] != user_role:
            continue
        if p["id"] not in user_acked_policy_ids:
            pending.append({
                **p,
                "is_acknowledged": False,
                "acknowledged_at": None,
            })

    return {
        "pending_policies": pending,
        "total_pending": len(pending),
    }


@router.get("/policies/{id}", response_model=PolicyItem, tags=["Policies & Compliance"])
async def get_policy_detail(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get detailed policy information by ID.
    Draft policies return 404 for non-admin users.
    """
    user_role = current_user.get("role", "student")
    user_id = current_user.get("id")

    policy = next((p for p in DB_POLICIES if p["id"] == id), None)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy document not found")

    if user_role != "admin" and policy["status"] != "published":
        raise HTTPException(status_code=403, detail="Policy is currently under review / draft status")

    user_ack = next(
        (ack for ack in DB_POLICY_ACKS if ack["policy_id"] == id and ack.get("user_id") == user_id),
        None,
    )

    return {
        **policy,
        "is_acknowledged": user_ack is not None,
        "acknowledged_at": user_ack.get("acknowledged_at") if user_ack else None,
    }


@router.post("/policies/{id}/acknowledge", response_model=PolicyAcknowledgeResponse, tags=["Policies & Compliance"])
async def acknowledge_policy(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Acknowledge a published policy. Stores student identity, timestamp, and policy version.
    """
    policy = next((p for p in DB_POLICIES if p["id"] == id), None)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    user_role = current_user.get("role", "student")
    if user_role != "admin" and policy["status"] != "published":
        raise HTTPException(status_code=400, detail="Cannot acknowledge an unpublished/draft policy")

    user_id = current_user.get("id")
    user_name = current_user.get("user_metadata", {}).get("full_name") or current_user.get("email") or "Student"
    now_iso = datetime.now(timezone.utc).isoformat()

    # Check if already acknowledged
    existing_ack = next(
        (ack for ack in DB_POLICY_ACKS if ack["policy_id"] == id and ack.get("user_id") == user_id),
        None,
    )

    if existing_ack:
        existing_ack["acknowledged_at"] = now_iso
        existing_ack["version"] = policy["version"]
        ack_record = existing_ack
    else:
        ack_record = {
            "id": f"ack-{uuid.uuid4().hex[:8]}",
            "policy_id": id,
            "user_id": user_id,
            "user_name": user_name,
            "version": policy["version"],
            "acknowledged_at": now_iso,
            "ip_address": "127.0.0.1",
        }
        DB_POLICY_ACKS.append(ack_record)

    return {
        "acknowledged": True,
        "policy_id": id,
        "policy_title": policy["title"],
        "version": policy["version"],
        "acknowledged_at": ack_record["acknowledged_at"],
        "message": f"Successfully recorded acknowledgement for '{policy['title']}' v{policy['version']}.",
    }


# ── Grievance Endpoints (User/Student Facing) ─────────────────────────────────

@router.post("/grievances", response_model=Dict[str, Any], tags=["Grievances & Redressal"])
@router.post("/policies/grievances", response_model=Dict[str, Any], tags=["Grievances & Redressal"])
async def submit_grievance(
    payload: GrievanceCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a formal student/stakeholder grievance.
    Enforces minimum 50 characters for description.
    Supports anonymous reporting while recording tracking reference (e.g. GRV-00001).
    Directly persists into student_grievances table.
    """
    count_q = text("SELECT COUNT(*) FROM student_grievances")
    current_count = (await db.execute(count_q)).scalar() or 0
    ref_number = f"GRV-{current_count + 1:05d}"
    
    grv_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    user_id = str(current_user.get("id") or current_user.get("sub") or "")

    user_meta = current_user.get("user_metadata") or {}
    user_name = user_meta.get("full_name") or current_user.get("full_name") or current_user.get("email") or "Student"
    user_email = current_user.get("email") or ""

    insert_q = text("""
        INSERT INTO student_grievances (
            id, reference, user_id, reporter_name, reporter_email,
            category, subject, description, is_anonymous, status,
            admin_response_notes, created_at, updated_at, resolved_at
        ) VALUES (
            :id, :reference, :user_id, :reporter_name, :reporter_email,
            :category, :subject, :description, :is_anonymous, :status,
            :admin_response_notes, :created_at, :updated_at, :resolved_at
        )
    """)
    await db.execute(insert_q, {
        "id": grv_id,
        "reference": ref_number,
        "user_id": user_id,
        "reporter_name": user_name,
        "reporter_email": user_email,
        "category": payload.category,
        "subject": payload.subject,
        "description": payload.description,
        "is_anonymous": 1 if payload.is_anonymous else 0,
        "status": "Received",
        "admin_response_notes": None,
        "created_at": now_iso,
        "updated_at": now_iso,
        "resolved_at": None,
    })

    await log_audit_event(
        user_id=user_id,
        action="submit_student_grievance",
        resource_type="student_grievances",
        resource_id=grv_id,
        details={"reference": ref_number, "category": payload.category, "is_anonymous": payload.is_anonymous},
        db=db,
    )

    return {
        "reference": ref_number,
        "id": grv_id,
        "category": payload.category,
        "subject": payload.subject,
        "status": "Received",
        "is_anonymous": payload.is_anonymous,
        "created_at": now_iso,
        "message": f"Grievance registered successfully with reference number {ref_number}. You may track resolution status in My Grievances.",
    }


@router.get("/grievances/me", response_model=Dict[str, Any], tags=["Grievances & Redressal"])
@router.get("/policies/grievances/me", response_model=Dict[str, Any], tags=["Grievances & Redressal"])
async def get_my_grievances(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve all grievances submitted by the current authenticated user directly from the database.
    Ensures student privacy and confidentiality.
    """
    user_id = str(current_user.get("id") or current_user.get("sub") or "")
    q = text("""
        SELECT * FROM student_grievances
        WHERE user_id = :user_id
        ORDER BY created_at DESC
    """)
    rows = (await db.execute(q, {"user_id": user_id})).mappings().all()
    
    grievances = []
    for r in rows:
        grievances.append({
            "id": str(r["id"]),
            "reference": r["reference"],
            "category": r["category"],
            "subject": r["subject"],
            "description": r["description"],
            "is_anonymous": bool(r["is_anonymous"]),
            "status": r["status"],
            "reporter_id": str(r["user_id"]),
            "reporter_name": r["reporter_name"],
            "reporter_email": r["reporter_email"],
            "admin_response_notes": r["admin_response_notes"],
            "created_at": str(r["created_at"]),
            "updated_at": str(r["updated_at"]),
            "resolved_at": str(r["resolved_at"]) if r["resolved_at"] else None,
        })

    return {
        "grievances": grievances,
        "total": len(grievances),
    }


# ── Administrative Compliance & Policy Management Endpoints ───────────────────

@router.get("/admin/policies", response_model=Dict[str, Any], tags=["Admin Policies & Compliance"])
async def get_admin_policies(
    admin: dict = Depends(require_role("admin")),
):
    """
    Administrative overview of all policies (published & drafts) with acknowledgement metrics.
    """
    policies_with_stats = []
    total_eligible = 160  # baseline student cohort

    for p in DB_POLICIES:
        acks_for_policy = [a for a in DB_POLICY_ACKS if a["policy_id"] == p["id"]]
        ack_count = len(acks_for_policy)
        policies_with_stats.append({
            **p,
            "total_acknowledgements": ack_count,
            "total_eligible_users": total_eligible,
        })

    return {
        "policies": policies_with_stats,
        "total": len(policies_with_stats),
    }


@router.post("/admin/policies", response_model=PolicyItem, tags=["Admin Policies & Compliance"])
async def create_policy(
    payload: PolicyCreate,
    admin: dict = Depends(require_role("admin")),
):
    """
    Create a new compliance policy document.
    """
    new_id = f"pol-{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_policy = {
        "id": new_id,
        "title": payload.title,
        "category": payload.category,
        "version": payload.version,
        "audience": payload.audience,
        "requires_acknowledgement": payload.requires_acknowledgement,
        "effective_date": payload.effective_date,
        "description": payload.description,
        "content": payload.content,
        "document_url": payload.document_url,
        "status": payload.status,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    DB_POLICIES.append(new_policy)
    return new_policy


@router.put("/admin/policies/{id}", response_model=PolicyItem, tags=["Admin Policies & Compliance"])
async def update_policy(
    id: str,
    payload: PolicyUpdate,
    admin: dict = Depends(require_role("admin")),
):
    """
    Update or re-version an existing compliance policy.
    """
    policy = next((p for p in DB_POLICIES if p["id"] == id), None)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        if v is not None:
            policy[k] = v

    policy["updated_at"] = datetime.now(timezone.utc).isoformat()
    return policy


@router.post("/admin/policies/{id}/publish", response_model=PolicyItem, tags=["Admin Policies & Compliance"])
async def publish_policy(
    id: str,
    admin: dict = Depends(require_role("admin")),
):
    """
    Publish a draft policy so it becomes immediately active for student/institutional visibility.
    """
    policy = next((p for p in DB_POLICIES if p["id"] == id), None)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    policy["status"] = "published"
    policy["updated_at"] = datetime.now(timezone.utc).isoformat()
    return policy


@router.get("/admin/grievances", response_model=Dict[str, Any], tags=["Admin Policies & Compliance"])
async def get_admin_grievances(
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    admin: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Administrative grievance repository directly queried from the database.
    Masks reporter personal identity if is_anonymous is True.
    """
    conditions = []
    params: Dict[str, Any] = {}
    if category and category != "all":
        conditions.append("LOWER(category) = :category")
        params["category"] = category.lower()
    if status_filter and status_filter != "all":
        conditions.append("LOWER(status) = :status_filter")
        params["status_filter"] = status_filter.lower()

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    q = text(f"SELECT * FROM student_grievances {where_clause} ORDER BY created_at DESC")
    rows = (await db.execute(q, params)).mappings().all()

    results: List[Dict[str, Any]] = []
    for r in rows:
        is_anon = bool(r["is_anonymous"])
        item = {
            "id": str(r["id"]),
            "reference": r["reference"],
            "category": r["category"],
            "subject": r["subject"],
            "description": r["description"],
            "is_anonymous": is_anon,
            "status": r["status"],
            "reporter_id": "ANON-REDACTED" if is_anon else str(r["user_id"]),
            "reporter_name": "Anonymous Student" if is_anon else r["reporter_name"],
            "reporter_email": "Protected by Policy" if is_anon else r["reporter_email"],
            "admin_response_notes": r["admin_response_notes"],
            "created_at": str(r["created_at"]),
            "updated_at": str(r["updated_at"]),
            "resolved_at": str(r["resolved_at"]) if r["resolved_at"] else None,
        }
        results.append(item)

    return {
        "grievances": results,
        "total": len(results),
    }


@router.put("/admin/grievances/{id}/status", response_model=GrievanceItem, tags=["Admin Policies & Compliance"])
async def update_grievance_status(
    id: str,
    payload: GrievanceStatusUpdate,
    admin: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Update grievance investigation status and provide official administrative response notes in the database.
    """
    find_q = text("SELECT * FROM student_grievances WHERE id = :id")
    row = (await db.execute(find_q, {"id": id})).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Grievance record not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    resolved_at = now_iso if payload.status in ["Resolved", "Closed"] else row["resolved_at"]

    update_q = text("""
        UPDATE student_grievances
        SET status = :status,
            admin_response_notes = :admin_response_notes,
            updated_at = :updated_at,
            resolved_at = :resolved_at
        WHERE id = :id
    """)
    await db.execute(update_q, {
        "id": id,
        "status": payload.status,
        "admin_response_notes": payload.admin_response_notes,
        "updated_at": now_iso,
        "resolved_at": resolved_at,
    })

    admin_user_id = str(admin.get("id") or admin.get("sub") or "")
    await log_audit_event(
        user_id=admin_user_id,
        action="update_grievance_status",
        resource_type="student_grievances",
        resource_id=id,
        details={"status": payload.status, "reference": row["reference"]},
        db=db,
    )

    updated_row = (await db.execute(find_q, {"id": id})).mappings().first()
    return GrievanceItem(
        id=str(updated_row["id"]),
        reference=updated_row["reference"],
        category=updated_row["category"],
        subject=updated_row["subject"],
        description=updated_row["description"],
        is_anonymous=bool(updated_row["is_anonymous"]),
        status=updated_row["status"],
        reporter_id=str(updated_row["user_id"]),
        reporter_name=updated_row["reporter_name"],
        reporter_email=updated_row["reporter_email"],
        admin_response_notes=updated_row["admin_response_notes"],
        created_at=str(updated_row["created_at"]),
        updated_at=str(updated_row["updated_at"]),
        resolved_at=str(updated_row["resolved_at"]) if updated_row["resolved_at"] else None,
    )
