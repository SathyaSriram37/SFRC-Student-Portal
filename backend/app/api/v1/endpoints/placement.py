"""
SFRC Placement & Career Portal API
Phase 12: Drives catalog, student eligibility computation, job applications, and admin moderation.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.security import get_current_user

router = APIRouter()

# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class EligibilityCheck(BaseModel):
    eligible: bool
    reasons: List[str]

class PlacementDrive(BaseModel):
    id: str
    company_name: str
    logo_url: Optional[str] = None
    role_title: str
    job_type: str = "Full-time"  # Full-time, Internship
    ctc_range: str  # e.g. "3.6 - 7.0 LPA"
    location: str
    eligible_departments: List[str]
    min_cgpa: float
    min_attendance: float
    drive_date: str
    application_deadline: str
    job_description: str
    rounds: List[str]
    total_openings: int
    is_active: bool = True
    created_at: str

class PlacementDriveWithEligibility(PlacementDrive):
    eligibility: EligibilityCheck
    has_applied: bool = False
    application_status: Optional[str] = None

class ApplicationSubmitRequest(BaseModel):
    resume_url: Optional[str] = None
    statement: Optional[str] = None

class PlacementApplication(BaseModel):
    id: str
    drive_id: str
    student_id: str
    student_name: str
    register_number: str
    department: str
    company_name: str
    role_title: str
    ctc_range: str
    cgpa_at_application: float
    attendance_at_application: float
    status: str  # applied, shortlisted, interview, selected, rejected
    applied_at: str
    updated_at: str
    interview_date: Optional[str] = None
    notes: Optional[str] = None

class ApplicationStatusUpdate(BaseModel):
    status: str  # applied, shortlisted, interview, selected, rejected
    interview_date: Optional[str] = None
    notes: Optional[str] = None

# ── Seed Data ─────────────────────────────────────────────────────────────────

SEED_DRIVES: List[Dict[str, Any]] = [
    {
        "id": "drive-tcs-001",
        "company_name": "Tata Consultancy Services (TCS)",
        "logo_url": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&auto=format&fit=crop&q=80",
        "role_title": "Ninja / Digital Software Engineer",
        "job_type": "Full-time",
        "ctc_range": "3.6 - 7.0 LPA",
        "location": "Chennai / Bangalore / Hyderabad",
        "eligible_departments": ["CS", "MATH", "PHY", "CHEM"],
        "min_cgpa": 7.0,
        "min_attendance": 75.0,
        "drive_date": (datetime.now(timezone.utc) + timedelta(days=15)).strftime("%Y-%m-%d"),
        "application_deadline": (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d"),
        "job_description": "TCS National Qualifier Test (NQT) campus drive for 2026 graduating batch. Roles across Fullstack Development, Cloud Solutions, and Data Engineering.",
        "rounds": ["Online Cognitive & Technical Test", "Technical Interview", "Managerial & HR Interview"],
        "total_openings": 45,
        "is_active": True,
        "created_at": "2026-09-15T09:00:00Z",
    },
    {
        "id": "drive-infy-002",
        "company_name": "Infosys",
        "logo_url": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&auto=format&fit=crop&q=80",
        "role_title": "Specialist Programmer / Systems Engineer",
        "job_type": "Full-time",
        "ctc_range": "3.6 - 9.5 LPA",
        "location": "Bangalore / Mysore / Chennai",
        "eligible_departments": ["CS", "MATH"],
        "min_cgpa": 7.5,
        "min_attendance": 75.0,
        "drive_date": (datetime.now(timezone.utc) + timedelta(days=20)).strftime("%Y-%m-%d"),
        "application_deadline": (datetime.now(timezone.utc) + timedelta(days=10)).strftime("%Y-%m-%d"),
        "job_description": "Campus recruitment for Specialist Programmer (High-Performance Coding) and Systems Engineer roles. Open to passionate student developers.",
        "rounds": ["HackWithInfy Coding Assessment", "Technical Architecture Interview", "HR Discussion"],
        "total_openings": 30,
        "is_active": True,
        "created_at": "2026-09-16T10:30:00Z",
    },
    {
        "id": "drive-cts-003",
        "company_name": "Cognizant (CTS)",
        "logo_url": "https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=300&auto=format&fit=crop&q=80",
        "role_title": "GenC Elevate / Programmer Analyst",
        "job_type": "Full-time",
        "ctc_range": "4.5 - 5.5 LPA",
        "location": "Chennai / Coimbatore / Kochi",
        "eligible_departments": ["CS", "MATH", "PHY", "COM"],
        "min_cgpa": 6.5,
        "min_attendance": 70.0,
        "drive_date": (datetime.now(timezone.utc) + timedelta(days=25)).strftime("%Y-%m-%d"),
        "application_deadline": (datetime.now(timezone.utc) + timedelta(days=12)).strftime("%Y-%m-%d"),
        "job_description": "GenC Elevate campus drive for modern digital engineering stack including Java Microservices, React, and AWS Cloud foundations.",
        "rounds": ["Communication Assessment", "Skill-based Coding Test", "Technical + HR Combo Round"],
        "total_openings": 50,
        "is_active": True,
        "created_at": "2026-09-18T11:00:00Z",
    },
    {
        "id": "drive-wipro-004",
        "company_name": "Wipro",
        "logo_url": "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=300&auto=format&fit=crop&q=80",
        "role_title": "Elite National Talent Hunt (Project Engineer)",
        "job_type": "Full-time",
        "ctc_range": "3.5 - 6.5 LPA",
        "location": "Chennai / Hyderabad / Pune",
        "eligible_departments": ["CS", "MATH", "PHY", "CHEM", "ENG", "COM"],
        "min_cgpa": 6.0,
        "min_attendance": 75.0,
        "drive_date": (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
        "application_deadline": (datetime.now(timezone.utc) + timedelta(days=18)).strftime("%Y-%m-%d"),
        "job_description": "Wipro Elite NTH engineering & analytics hiring drive. Candidates will work on cutting-edge enterprise cloud transformations.",
        "rounds": ["Aptitude & Written Communication", "Online Coding Challenge", "Business & HR Interview"],
        "total_openings": 60,
        "is_active": True,
        "created_at": "2026-09-20T14:15:00Z",
    },
    {
        "id": "drive-lt-005",
        "company_name": "Larsen & Toubro (L&T)",
        "logo_url": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=300&auto=format&fit=crop&q=80",
        "role_title": "Graduate Trainee Engineer / Technology Analyst",
        "job_type": "Full-time",
        "ctc_range": "5.0 - 6.5 LPA",
        "location": "Chennai / Mumbai / Vadodara",
        "eligible_departments": ["CS", "MATH", "PHY"],
        "min_cgpa": 8.0,
        "min_attendance": 80.0,
        "drive_date": (datetime.now(timezone.utc) + timedelta(days=35)).strftime("%Y-%m-%d"),
        "application_deadline": (datetime.now(timezone.utc) + timedelta(days=22)).strftime("%Y-%m-%d"),
        "job_description": "Core software and industrial automation systems analyst role. High academic standards required (CGPA >= 8.0 & 80%+ Attendance).",
        "rounds": ["Domain Technical Exam", "Advanced Analytical Screening", "Technical Panel", "HR Interview"],
        "total_openings": 20,
        "is_active": True,
        "created_at": "2026-09-22T16:00:00Z",
    },
]

# Applications Storage
PLACEMENT_APPLICATIONS: List[Dict[str, Any]] = [
    {
        "id": "app-001",
        "drive_id": "drive-tcs-001",
        "student_id": "std-2023-001",
        "student_name": "Kavitha Raman",
        "register_number": "21UCS042",
        "department": "CS",
        "company_name": "Tata Consultancy Services (TCS)",
        "role_title": "Ninja / Digital Software Engineer",
        "ctc_range": "3.6 - 7.0 LPA",
        "cgpa_at_application": 8.6,
        "attendance_at_application": 87.5,
        "status": "shortlisted",
        "applied_at": "2026-09-23T10:00:00Z",
        "updated_at": "2026-09-25T14:30:00Z",
        "interview_date": (datetime.now(timezone.utc) + timedelta(days=12)).strftime("%Y-%m-%d"),
        "notes": "Cleared NQT Round with 92nd percentile score.",
    }
]

# ── Helper Functions ──────────────────────────────────────────────────────────

def compute_student_metrics(user: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate or look up the student's actual CGPA, attendance, and department."""
    cgpa = 8.6
    att_pct = 87.5
    dept = "CS"

    # If user has custom claims or student record
    if user.get("cgpa") is not None:
        cgpa = float(user["cgpa"])
    if user.get("attendance_pct") is not None:
        att_pct = float(user["attendance_pct"])
    if user.get("department_code") is not None:
        dept = user["department_code"]

    return {
        "student_id": user.get("sub") or user.get("id") or "std-2023-001",
        "student_name": user.get("name") or user.get("user_metadata", {}).get("full_name") or "Kavitha Raman",
        "register_number": user.get("register_number") or "21UCS042",
        "department": dept,
        "cgpa": cgpa,
        "attendance": att_pct,
    }

def check_eligibility(drive: Dict[str, Any], student_info: Dict[str, Any]) -> EligibilityCheck:
    """Pre-computes whether the student is eligible with explanatory reasons."""
    reasons: List[str] = []
    is_eligible = True

    # 1. Department Check
    dept = student_info["department"]
    if drive["eligible_departments"] and dept not in drive["eligible_departments"]:
        reasons.append(f"Department {dept} not in eligible list ({', '.join(drive['eligible_departments'])}) ✗")
        is_eligible = False
    else:
        reasons.append(f"Department {dept} is eligible ✓")

    # 2. CGPA Check
    cgpa = student_info["cgpa"]
    min_cgpa = drive["min_cgpa"]
    if cgpa < min_cgpa:
        reasons.append(f"CGPA {cgpa:.1f} < {min_cgpa:.1f} threshold ✗")
        is_eligible = False
    else:
        reasons.append(f"CGPA {cgpa:.1f} >= {min_cgpa:.1f} threshold ✓")

    # 3. Attendance Check
    att = student_info["attendance"]
    min_att = drive["min_attendance"]
    if att < min_att:
        reasons.append(f"Attendance {att:.1f}% < {min_att:.1f}% required ✗")
        is_eligible = False
    else:
        reasons.append(f"Attendance {att:.1f}% >= {min_att:.1f}% required ✓")

    # 4. Deadline Check
    try:
        deadline = datetime.strptime(drive["application_deadline"], "%Y-%m-%d").date()
        today = datetime.now(timezone.utc).date()
        if today > deadline:
            reasons.append(f"Application deadline expired on {drive['application_deadline']} ✗")
            is_eligible = False
    except Exception:
        pass

    return EligibilityCheck(eligible=is_eligible, reasons=reasons)

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/drives", response_model=Dict[str, Any])
async def list_placement_drives(
    dept: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    List all active placement drives with precomputed student eligibility.
    """
    student_info = compute_student_metrics(current_user)
    student_id = student_info["student_id"]

    # Student's current application map: drive_id -> status
    my_app_map = {
        app["drive_id"]: app["status"]
        for app in PLACEMENT_APPLICATIONS
        if app["student_id"] == student_id
    }

    results: List[PlacementDriveWithEligibility] = []
    for d in SEED_DRIVES:
        if not d.get("is_active", True):
            continue
        if dept and dept != "all" and dept not in d["eligible_departments"]:
            continue
        if search:
            q = search.lower()
            if (
                q not in d["company_name"].lower()
                and q not in d["role_title"].lower()
                and q not in d["job_description"].lower()
            ):
                continue

        eligibility = check_eligibility(d, student_info)
        has_applied = d["id"] in my_app_map

        item = PlacementDriveWithEligibility(
            **d,
            eligibility=eligibility,
            has_applied=has_applied,
            application_status=my_app_map.get(d["id"]),
        )
        results.append(item)

    return {
        "drives": results,
        "total": len(results),
        "student_profile": {
            "name": student_info["student_name"],
            "register_number": student_info["register_number"],
            "department": student_info["department"],
            "cgpa": student_info["cgpa"],
            "attendance": student_info["attendance"],
        },
    }

@router.get("/drives/{id}", response_model=PlacementDriveWithEligibility)
async def get_placement_drive_detail(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Get detailed placement drive info with eligibility breakdown.
    """
    drive = next((d for d in SEED_DRIVES if d["id"] == id), None)
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")

    student_info = compute_student_metrics(current_user)
    student_id = student_info["student_id"]
    eligibility = check_eligibility(drive, student_info)

    my_app = next(
        (a for a in PLACEMENT_APPLICATIONS if a["drive_id"] == id and a["student_id"] == student_id),
        None,
    )

    return PlacementDriveWithEligibility(
        **drive,
        eligibility=eligibility,
        has_applied=my_app is not None,
        application_status=my_app["status"] if my_app else None,
    )

@router.post("/drives/{id}/apply", response_model=PlacementApplication)
async def apply_for_placement_drive(
    id: str,
    body: Optional[ApplicationSubmitRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Submit application for a drive with strict server-side eligibility enforcement.
    """
    drive = next((d for d in SEED_DRIVES if d["id"] == id), None)
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")

    student_info = compute_student_metrics(current_user)
    student_id = student_info["student_id"]

    # 1. Check if already applied
    existing = next(
        (a for a in PLACEMENT_APPLICATIONS if a["drive_id"] == id and a["student_id"] == student_id),
        None,
    )
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied for this placement drive.")

    # 2. Strict server-side eligibility check
    eligibility = check_eligibility(drive, student_info)
    if not eligibility.eligible:
        raise HTTPException(
            status_code=403,
            detail=f"Ineligible to apply: {'; '.join(eligibility.reasons)}",
        )

    now_str = datetime.now(timezone.utc).isoformat()
    new_app = {
        "id": f"app-{uuid.uuid4().hex[:8]}",
        "drive_id": drive["id"],
        "student_id": student_id,
        "student_name": student_info["student_name"],
        "register_number": student_info["register_number"],
        "department": student_info["department"],
        "company_name": drive["company_name"],
        "role_title": drive["role_title"],
        "ctc_range": drive["ctc_range"],
        "cgpa_at_application": student_info["cgpa"],
        "attendance_at_application": student_info["attendance"],
        "status": "applied",
        "applied_at": now_str,
        "updated_at": now_str,
        "interview_date": None,
        "notes": "Application submitted by student.",
    }

    PLACEMENT_APPLICATIONS.append(new_app)
    return PlacementApplication(**new_app)

@router.get("/me/applications", response_model=List[PlacementApplication])
async def get_my_placement_applications(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Get all placement applications submitted by current student.
    """
    student_info = compute_student_metrics(current_user)
    student_id = student_info["student_id"]

    apps = [a for a in PLACEMENT_APPLICATIONS if a["student_id"] == student_id]
    return [PlacementApplication(**a) for a in apps]

@router.put("/admin/applications/{id}/status", response_model=PlacementApplication)
async def update_application_status(
    id: str,
    body: ApplicationStatusUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Update application status (applied -> shortlisted -> interview -> selected/rejected).
    Requires faculty or admin capability.
    """
    role = current_user.get("role", "student")
    if role not in ["admin", "faculty"]:
        raise HTTPException(status_code=403, detail="Only placement coordinators or admins can update application statuses.")

    app_obj = next((a for a in PLACEMENT_APPLICATIONS if a["id"] == id), None)
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application record not found")

    app_obj["status"] = body.status
    app_obj["updated_at"] = datetime.now(timezone.utc).isoformat()
    if body.interview_date:
        app_obj["interview_date"] = body.interview_date
    if body.notes:
        app_obj["notes"] = body.notes

    return PlacementApplication(**app_obj)

@router.get("/admin/applications", response_model=List[PlacementApplication])
async def list_all_placement_applications(
    drive_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Admin listing of all student placement applications across drives.
    """
    role = current_user.get("role", "student")
    if role not in ["admin", "faculty"]:
        raise HTTPException(status_code=403, detail="Admin privilege required")

    results = PLACEMENT_APPLICATIONS
    if drive_id:
        results = [r for r in results if r["drive_id"] == drive_id]
    if status_filter:
        results = [r for r in results if r["status"] == status_filter]

    return [PlacementApplication(**r) for r in results]
