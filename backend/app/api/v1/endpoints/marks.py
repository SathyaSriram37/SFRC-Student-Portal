"""Marks endpoints — entry, validation, CIA recording, and semester result queries."""
from __future__ import annotations

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


class StudentMarkEntry(BaseModel):
    student_id: str
    marks_obtained: float
    max_marks: float = 100.0


class EnterMarksRequest(BaseModel):
    course_id: str
    assessment_type: str  # CIA1 | CIA2 | CIA3 | Model | External | Assignment | Practical
    academic_year: str
    semester: int
    records: List[StudentMarkEntry]


class EnterMarksResponse(BaseModel):
    success: bool
    entered_count: int
    course_id: str
    assessment_type: str
    message: str


@router.post("/enter", response_model=EnterMarksResponse, status_code=status.HTTP_200_OK)
async def enter_marks(
    body: EnterMarksRequest,
    db: AsyncSession = Depends(get_db),
    user: dict[str, Any] = Depends(require_capability("marks:enter")),
):
    """Batch entry for student assessment marks with boundary validation and audit logging."""
    allowed_types = ["CIA1", "CIA2", "CIA3", "Model", "External", "Assignment", "Practical"]
    if body.assessment_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid assessment type. Must be one of: {allowed_types}",
        )

    # Validate boundary conditions (0 <= marks_obtained <= max_marks)
    for rec in body.records:
        if rec.marks_obtained < 0 or rec.marks_obtained > rec.max_marks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Marks boundary error for student {rec.student_id}: {rec.marks_obtained} is not between 0 and {rec.max_marks}",
            )

    user_id = user.get("id") or user.get("sub")
    fac_query = text("SELECT id FROM public.faculty WHERE user_id = :user_id::uuid")
    fac_row = (await db.execute(fac_query, {"user_id": user_id})).mappings().first()
    faculty_id = str(fac_row["id"]) if fac_row else None

    # Upsert each record
    delete_existing = text("""
        DELETE FROM public.marks 
        WHERE course_id = :course_id::uuid 
          AND assessment_type = :assessment_type 
          AND academic_year = :academic_year 
          AND semester = :semester
          AND student_id = :student_id::uuid
    """)

    insert_sql = text("""
        INSERT INTO public.marks (student_id, course_id, assessment_type, marks_obtained, max_marks, academic_year, semester, entered_by)
        VALUES (:student_id::uuid, :course_id::uuid, :assessment_type, :marks_obtained, :max_marks, :academic_year, :semester, :entered_by::uuid)
    """)

    count = 0
    for rec in body.records:
        await db.execute(delete_existing, {
            "course_id": body.course_id,
            "assessment_type": body.assessment_type,
            "academic_year": body.academic_year,
            "semester": body.semester,
            "student_id": rec.student_id,
        })
        await db.execute(insert_sql, {
            "student_id": rec.student_id,
            "course_id": body.course_id,
            "assessment_type": body.assessment_type,
            "marks_obtained": rec.marks_obtained,
            "max_marks": rec.max_marks,
            "academic_year": body.academic_year,
            "semester": body.semester,
            "entered_by": faculty_id,
        })
        count += 1

    # Record audit log
    await log_audit_event(
        user_id=user_id,
        action="FACULTY_ENTER_MARKS",
        resource_type="marks",
        resource_id=body.course_id,
        details={
            "course_id": body.course_id,
            "assessment_type": body.assessment_type,
            "academic_year": body.academic_year,
            "semester": body.semester,
            "count": count,
        },
        session=db,
    )

    return EnterMarksResponse(
        success=True,
        entered_count=count,
        course_id=body.course_id,
        assessment_type=body.assessment_type,
        message=f"Successfully recorded {body.assessment_type} marks for {count} students.",
    )


@router.get("/student/{student_id}")
async def get_student_marks(
    student_id: str,
    semester: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Retrieve all marks for a student."""
    query = text("""
        SELECT m.id, m.assessment_type, m.marks_obtained, m.max_marks, m.academic_year, m.semester, c.code as course_code, c.title as course_title
        FROM public.marks m
        JOIN public.courses c ON m.course_id = c.id
        WHERE m.student_id = :student_id::uuid
          AND (:semester::int IS NULL OR m.semester = :semester::int)
        ORDER BY m.created_at DESC
    """)
    rows = (await db.execute(query, {"student_id": student_id, "semester": semester})).mappings().all()
    return {"student_id": student_id, "marks": [dict(r) for r in rows]}
