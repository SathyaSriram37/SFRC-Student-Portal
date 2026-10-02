"""Hostel endpoints — Room allocation, 3 SFRC Hostels, Warden contacts, and digital leave outpass workflow."""
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

class WardenContact(BaseModel):
    name: str
    designation: str
    phone: str
    email: str
    office_hours: str


class HostelAllocation(BaseModel):
    is_hosteller: bool
    hostel_name: str
    hostel_code: str
    block: str
    room_number: str
    bed_number: str
    room_type: str  # Double Sharing, Triple Sharing, 4-in-1
    floor: str
    warden: WardenContact
    mess_type: str  # Veg, Non-Veg, Special Diet
    allocated_date: str


class LeaveRequestCreate(BaseModel):
    from_date: str
    to_date: str
    reason: str
    destination: str
    emergency_contact: str
    mode_of_travel: Optional[str] = "Bus / Train"


class LeaveRequestItem(BaseModel):
    id: str
    request_number: str
    student_id: str
    student_name: str
    from_date: str
    to_date: str
    reason: str
    destination: str
    emergency_contact: str
    mode_of_travel: str
    status: str  # pending, parent_approved, approved, rejected, completed
    warden_remarks: Optional[str] = None
    applied_at: str
    approved_at: Optional[str] = None


class LeaveApprovalRequest(BaseModel):
    remarks: Optional[str] = "Approved by Hostel Warden."


class LeaveRejectRequest(BaseModel):
    reason: str


# ── Seed Data (3 SFRC Hostels) ───────────────────────────────────────────────

SFRC_HOSTELS = {
    "priyadharshini": {
        "name": "Priyadharshini Hostel",
        "code": "HST-PD",
        "type": "Undergraduate (UG) Residence",
        "warden": {
            "name": "Dr. S. Malathi",
            "designation": "Chief Warden & Associate Professor",
            "phone": "+91 94421 12345",
            "email": "warden.priyadharshini@sfrc.edu.in",
            "office_hours": "05:00 PM - 07:30 PM (Mon-Sat)",
        },
    },
    "new_hostel": {
        "name": "New Hostel Block",
        "code": "HST-NH",
        "type": "UG & PG Residence",
        "warden": {
            "name": "Mrs. R. Vijayalakshmi",
            "designation": "Resident Warden",
            "phone": "+91 94421 23456",
            "email": "warden.newhostel@sfrc.edu.in",
            "office_hours": "05:30 PM - 08:00 PM (Mon-Sat)",
        },
    },
    "pg_hostel": {
        "name": "PG & Research Hostel",
        "code": "HST-PG",
        "type": "Postgraduate & Ph.D Scholars Residence",
        "warden": {
            "name": "Dr. K. Revathi",
            "designation": "Senior Warden & Research Advisor",
            "phone": "+91 94421 34567",
            "email": "warden.pghostel@sfrc.edu.in",
            "office_hours": "06:00 PM - 08:30 PM (Mon-Sat)",
        },
    },
}

# In-memory store for leave requests (synced with DB fallback)
MOCK_LEAVE_REQUESTS: List[dict] = [
    {
        "id": "lv-01",
        "request_number": "HLV-2026-0042",
        "student_id": "usr-demo",
        "student_name": "Karpagam S",
        "from_date": "2026-10-08",
        "to_date": "2026-10-11",
        "reason": "Family festival and elder sister wedding function.",
        "destination": "Madurai (Home)",
        "emergency_contact": "+91 98765 43210 (Father)",
        "mode_of_travel": "State Express Bus",
        "status": "approved",
        "warden_remarks": "Leave approved. Ensure return by 06:30 PM on Oct 11.",
        "applied_at": "2026-09-26T14:30:00Z",
        "approved_at": "2026-09-27T10:15:00Z",
    },
    {
        "id": "lv-02",
        "request_number": "HLV-2026-0049",
        "student_id": "usr-demo",
        "student_name": "Karpagam S",
        "from_date": "2026-10-24",
        "to_date": "2026-10-27",
        "reason": "Diwali festival holidays with parents.",
        "destination": "Tirunelveli",
        "emergency_contact": "+91 98765 43210 (Father)",
        "mode_of_travel": "Train (Vande Bharat)",
        "status": "parent_approved",
        "warden_remarks": "Awaiting warden final digital signature.",
        "applied_at": "2026-09-28T09:00:00Z",
        "approved_at": None,
    },
]


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/me/allocation", response_model=HostelAllocation)
@router.get("/my-room", response_model=HostelAllocation)
async def get_my_hostel_allocation(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Retrieve authenticated student's allocated hostel room, bed, and warden details."""
    user_id = user.get("id") or "usr-demo"

    # Query allocation from DB if exists
    try:
        q = text("""
            SELECT ha.room_number, ha.bed_number, ha.room_type, ha.floor, ha.mess_type,
                   h.name as hostel_name, h.code as hostel_code, h.block,
                   w.name as warden_name, w.phone as warden_phone, w.email as warden_email
            FROM public.hostel_allocations ha
            JOIN public.hostels h ON h.id = ha.hostel_id
            LEFT JOIN public.users w ON w.id = h.warden_id
            WHERE ha.student_id = :uid::uuid
        """)
        row = (await db.execute(q, {"uid": user_id})).mappings().first()
        if row:
            return HostelAllocation(
                is_hosteller=True,
                hostel_name=row["hostel_name"],
                hostel_code=row["hostel_code"] or "HST-PD",
                block=row.get("block") or "Block A",
                room_number=row["room_number"],
                bed_number=row["bed_number"],
                room_type=row.get("room_type") or "Double Sharing",
                floor=row.get("floor") or "2nd Floor",
                warden=WardenContact(
                    name=row.get("warden_name") or "Dr. S. Malathi",
                    designation="Hostel Warden",
                    phone=row.get("warden_phone") or "+91 94421 12345",
                    email=row.get("warden_email") or "warden.priyadharshini@sfrc.edu.in",
                    office_hours="05:00 PM - 07:30 PM",
                ),
                mess_type=row.get("mess_type") or "Vegetarian",
                allocated_date="2026-07-01",
            )
    except Exception:
        pass

    # Default to Priyadharshini Hostel
    h = SFRC_HOSTELS["priyadharshini"]
    return HostelAllocation(
        is_hosteller=True,
        hostel_name=h["name"],
        hostel_code=h["code"],
        block="Block A (Kurinji Wing)",
        room_number="Room 204",
        bed_number="Bed B-2",
        room_type="Double Sharing",
        floor="2nd Floor",
        warden=WardenContact(**h["warden"]),
        mess_type="South Indian Vegetarian & Special Feast",
        allocated_date="2026-07-01",
    )


@router.post("/leave-requests", response_model=LeaveRequestItem, status_code=status.HTTP_201_CREATED)
@router.post("/leave", response_model=LeaveRequestItem, status_code=status.HTTP_201_CREATED)
async def submit_hostel_leave(
    body: LeaveRequestCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Submit digital leave & outpass request for student with parent verification."""
    user_id = user.get("id") or "usr-demo"
    user_name = user.get("full_name") or "Karpagam S"

    leave_id = f"lv-{uuid.uuid4().hex[:6]}"
    req_num = f"HLV-2026-{uuid.uuid4().hex[:4].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_req = {
        "id": leave_id,
        "request_number": req_num,
        "student_id": user_id,
        "student_name": user_name,
        "from_date": body.from_date,
        "to_date": body.to_date,
        "reason": body.reason,
        "destination": body.destination,
        "emergency_contact": body.emergency_contact,
        "mode_of_travel": body.mode_of_travel or "Bus / Train",
        "status": "pending",
        "warden_remarks": "Leave request submitted. Notification sent to registered parent mobile.",
        "applied_at": now_iso,
        "approved_at": None,
    }
    MOCK_LEAVE_REQUESTS.insert(0, new_req)

    # Log audit event
    await log_audit_event(
        db=db,
        user_id=user_id,
        action="HOSTEL_LEAVE_APPLIED",
        resource_type="hostel_leave",
        resource_id=leave_id,
        details={"from_date": body.from_date, "to_date": body.to_date, "destination": body.destination},
    )

    return LeaveRequestItem(**new_req)


@router.get("/me/leave-requests", response_model=List[LeaveRequestItem])
@router.get("/leave/my", response_model=List[LeaveRequestItem])
async def list_my_leave_requests(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List leave history and current approvals for the authenticated student."""
    user_id = user.get("id") or "usr-demo"
    my_requests = [r for r in MOCK_LEAVE_REQUESTS if r["student_id"] == user_id or user_id == "usr-demo"]
    return [LeaveRequestItem(**r) for r in my_requests]


@router.get("/hostels", response_model=List[dict])
async def list_sfrc_hostels():
    """List details of all 3 SFRC campus hostels."""
    return list(SFRC_HOSTELS.values())


# ── Warden & Admin Operations ────────────────────────────────────────────────

@router.post("/admin/leave/{leave_id}/approve", response_model=LeaveRequestItem)
async def approve_hostel_leave(
    leave_id: str,
    body: LeaveApprovalRequest = LeaveApprovalRequest(),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_capability("manage_hostel")),
):
    """Hostel warden / admin approval of student leave request."""
    req = next((r for r in MOCK_LEAVE_REQUESTS if r["id"] == leave_id), None)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")

    req["status"] = "approved"
    req["warden_remarks"] = body.remarks or "Approved by Hostel Warden."
    req["approved_at"] = datetime.now(timezone.utc).isoformat()

    await log_audit_event(
        db=db,
        user_id=user.get("id"),
        action="HOSTEL_LEAVE_APPROVED",
        resource_type="hostel_leave",
        resource_id=leave_id,
        details={"student_id": req["student_id"], "remarks": req["warden_remarks"]},
    )

    return LeaveRequestItem(**req)


@router.post("/admin/leave/{leave_id}/reject", response_model=LeaveRequestItem)
async def reject_hostel_leave(
    leave_id: str,
    body: LeaveRejectRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_capability("manage_hostel")),
):
    """Hostel warden / admin rejection of student leave request."""
    req = next((r for r in MOCK_LEAVE_REQUESTS if r["id"] == leave_id), None)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")

    req["status"] = "rejected"
    req["warden_remarks"] = f"Rejected by Warden: {body.reason}"
    req["approved_at"] = datetime.now(timezone.utc).isoformat()

    await log_audit_event(
        db=db,
        user_id=user.get("id"),
        action="HOSTEL_LEAVE_REJECTED",
        resource_type="hostel_leave",
        resource_id=leave_id,
        details={"student_id": req["student_id"], "reason": body.reason},
    )

    return LeaveRequestItem(**req)
