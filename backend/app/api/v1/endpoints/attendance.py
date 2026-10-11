"""Attendance marking and retrieval endpoints."""
from __future__ import annotations

import uuid
from datetime import date
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.capabilities import require_capability
from app.core.audit import log_audit_event

router = APIRouter()


class AttendanceRecordEntry(BaseModel):
    student_id: str
    status: str  # present | absent | od | medical


class MarkAttendanceRequest(BaseModel):
    course_id: str
    date: str  # YYYY-MM-DD
    session: str  # FN | AN
    records: List[AttendanceRecordEntry]


class MarkAttendanceResponse(BaseModel):
    success: bool
    marked_count: int
    course_id: str
    date: str
    session: str
    message: str


@router.post("/mark", response_model=MarkAttendanceResponse, status_code=status.HTTP_200_OK)
async def mark_bulk_attendance(
    body: MarkAttendanceRequest,
    db: AsyncSession = Depends(get_db),
    user: dict[str, Any] = Depends(require_capability("attendance:mark")),
):
    """Bulk entry for course attendance by faculty with conflict resolution and audit logging."""
    if body.session not in ["FN", "AN"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session must be either 'FN' or 'AN'",
        )

    user_id = user.get("id") or user.get("sub")
    
    # Resolve faculty id
    fac_query = text("SELECT id FROM faculty WHERE user_id = :user_id")
    fac_row = (await db.execute(fac_query, {"user_id": user_id})).mappings().first()
    faculty_id = str(fac_row["id"]) if fac_row else str(user_id)

    valid_statuses = ["present", "absent", "od", "medical"]
    count = 0

    delete_sql = text("""
        DELETE FROM attendance_records
        WHERE student_id = :student_id
          AND course_id = :course_id
          AND date = :date
          AND session = :session
    """)

    insert_sql = text("""
        INSERT INTO attendance_records (id, student_id, course_id, date, session, status, marked_by, created_at)
        VALUES (:id, :student_id, :course_id, :date, :session, :status, :marked_by, CURRENT_TIMESTAMP)
    """)

    for rec in body.records:
        rec_status = rec.status.lower()
        if rec_status not in valid_statuses:
            rec_status = "present"

        await db.execute(delete_sql, {
            "student_id": rec.student_id,
            "course_id": body.course_id,
            "date": body.date,
            "session": body.session,
        })

        await db.execute(insert_sql, {
            "id": str(uuid.uuid4()),
            "student_id": rec.student_id,
            "course_id": body.course_id,
            "date": body.date,
            "session": body.session,
            "status": rec_status,
            "marked_by": faculty_id,
        })
        count += 1

    # Record audit log
    await log_audit_event(
        user_id=user_id,
        action="FACULTY_MARK_ATTENDANCE",
        resource_type="attendance_records",
        resource_id=body.course_id,
        details={
            "course_id": body.course_id,
            "date": body.date,
            "session": body.session,
            "count": count,
        },
        session=db,
    )

    return MarkAttendanceResponse(
        success=True,
        marked_count=count,
        course_id=body.course_id,
        date=body.date,
        session=body.session,
        message=f"Successfully recorded attendance for {count} students.",
    )


@router.get("/summary/{student_id}")
async def get_attendance_summary(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get attendance percentage summary per course for a student."""
    query = text("""
        SELECT 
            c.code as course_code,
            c.title as course_title,
            COUNT(*) as total,
            SUM(CASE WHEN ar.status IN ('present', 'od') THEN 1 ELSE 0 END) as attended
        FROM attendance_records ar
        JOIN courses c ON ar.course_id = c.id
        WHERE ar.student_id = :student_id
        GROUP BY c.id, c.code, c.title
    """)
    rows = (await db.execute(query, {"student_id": student_id})).mappings().all()
    return {
        "student_id": student_id,
        "courses": [
            {
                "course_code": r["course_code"],
                "course_title": r["course_title"],
                "total": r["total"],
                "attended": r["attended"] or 0,
                "percentage": round(((r["attended"] or 0) / r["total"] * 100.0), 1) if r["total"] > 0 else 100.0,
            }
            for r in rows
        ],
    }
