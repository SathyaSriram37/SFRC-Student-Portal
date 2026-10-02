"""Faculty endpoints — dashboard, class schedule, assigned courses, enrolled students roster."""
from __future__ import annotations

from datetime import date
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.capabilities import require_capability

router = APIRouter()


class FacultyScheduleItem(BaseModel):
    id: str
    period_number: int
    start_time: str
    end_time: str
    room: Optional[str] = None
    course_code: str
    course_title: str
    programme_name: Optional[str] = None
    semester: Optional[int] = None


class PendingAttendanceItem(BaseModel):
    course_id: str
    course_code: str
    course_title: str
    semester: Optional[int] = None
    start_time: Optional[str] = None


class FacultyProfileSummary(BaseModel):
    faculty_id: str
    full_name: str
    employee_id: str
    designation: Optional[str] = None
    department_name: Optional[str] = None


class FacultyDashboardResponse(BaseModel):
    profile: FacultyProfileSummary
    today_schedule: List[FacultyScheduleItem]
    pending_attendance_courses: List[PendingAttendanceItem]
    pending_marks_count: int
    mentee_count: int
    total_classes_today: int


class FacultyCourseItem(BaseModel):
    id: str
    code: str
    title: str
    programme_name: Optional[str] = None
    semester: int
    department_name: Optional[str] = None
    credits: int
    total_students: int


class EnrolledStudentRosterItem(BaseModel):
    student_id: str
    register_number: str
    full_name: str
    avatar_url: Optional[str] = None
    current_semester: int
    attendance_pct: float
    last_status: Optional[str] = None  # present | absent | od | medical


async def get_faculty_record_by_user_id(db: AsyncSession, user_id: str) -> Optional[dict]:
    query = text("""
        SELECT 
            f.id as faculty_id,
            f.employee_id,
            f.designation,
            d.name as department_name,
            up.full_name
        FROM public.faculty f
        JOIN public.user_profiles up ON f.user_id = up.id
        LEFT JOIN public.departments d ON f.department_id = d.id
        WHERE f.user_id = :user_id::uuid
    """)
    row = (await db.execute(query, {"user_id": user_id})).mappings().first()
    return dict(row) if row else None


@router.get("/me/dashboard", response_model=FacultyDashboardResponse)
async def get_faculty_dashboard(
    db: AsyncSession = Depends(get_db),
    user: dict[str, Any] = Depends(require_capability("attendance:mark")),
):
    """Return database-driven daily agenda, pending attendance, and mentee count for faculty."""
    user_id = user.get("id") or user.get("sub")
    fac_row = await get_faculty_record_by_user_id(db, user_id)

    if not fac_row:
        prof_query = text("SELECT full_name FROM public.user_profiles WHERE id = :user_id::uuid")
        p_row = (await db.execute(prof_query, {"user_id": user_id})).mappings().first()
        full_name = p_row["full_name"] if p_row else user.get("email", "").split("@")[0]
        faculty_profile = FacultyProfileSummary(
            faculty_id=str(user_id),
            full_name=full_name,
            employee_id="EMP-101",
            designation="Assistant Professor",
            department_name="Computer Science",
        )
        faculty_id = None
    else:
        faculty_id = str(fac_row["faculty_id"])
        faculty_profile = FacultyProfileSummary(
            faculty_id=faculty_id,
            full_name=fac_row["full_name"],
            employee_id=fac_row["employee_id"],
            designation=fac_row["designation"],
            department_name=fac_row["department_name"],
        )

    day_of_week = date.today().isoweekday()
    schedule_items: List[FacultyScheduleItem] = []
    if faculty_id:
        sched_query = text("""
            SELECT 
                t.id, t.period_number, t.start_time::text, t.end_time::text, t.room, t.semester,
                c.code as course_code, c.title as course_title,
                p.name as programme_name
            FROM public.timetables t
            JOIN public.courses c ON t.course_id = c.id
            LEFT JOIN public.programmes p ON t.programme_id = p.id
            WHERE t.faculty_id = :faculty_id::uuid AND t.day_of_week = :day_of_week
            ORDER BY t.period_number ASC
        """)
        s_rows = (await db.execute(sched_query, {"faculty_id": faculty_id, "day_of_week": day_of_week})).mappings().all()
        schedule_items = [
            FacultyScheduleItem(
                id=str(r["id"]),
                period_number=r["period_number"] or 1,
                start_time=r["start_time"],
                end_time=r["end_time"],
                room=r["room"],
                course_code=r["course_code"],
                course_title=r["course_title"],
                programme_name=r["programme_name"],
                semester=r["semester"],
            )
            for r in s_rows
        ]

    pending_attendance: List[PendingAttendanceItem] = []
    if faculty_id:
        pending_query = text("""
            SELECT DISTINCT 
                c.id as course_id, c.code as course_code, c.title as course_title,
                t.semester, t.start_time::text
            FROM public.timetables t
            JOIN public.courses c ON t.course_id = c.id
            WHERE t.faculty_id = :faculty_id::uuid 
              AND t.day_of_week = :day_of_week
              AND NOT EXISTS (
                  SELECT 1 FROM public.attendance_records ar 
                  WHERE ar.course_id = c.id 
                    AND ar.date = CURRENT_DATE 
                    AND ar.marked_by = :faculty_id::uuid
              )
        """)
        p_rows = (await db.execute(pending_query, {"faculty_id": faculty_id, "day_of_week": day_of_week})).mappings().all()
        pending_attendance = [
            PendingAttendanceItem(
                course_id=str(r["course_id"]),
                course_code=r["course_code"],
                course_title=r["course_title"],
                semester=r["semester"],
                start_time=r["start_time"],
            )
            for r in p_rows
        ]

    pending_marks_count = 0
    if faculty_id:
        marks_pending_query = text("""
            SELECT COUNT(DISTINCT e.course_id)
            FROM public.enrollments e
            JOIN public.timetables t ON e.course_id = t.course_id
            WHERE t.faculty_id = :faculty_id::uuid
              AND NOT EXISTS (
                  SELECT 1 FROM public.marks m 
                  WHERE m.course_id = e.course_id 
                    AND m.student_id = e.student_id
              )
        """)
        pending_marks_count = (await db.execute(marks_pending_query, {"faculty_id": faculty_id})).scalar() or 0

    mentee_count = 0
    if faculty_id:
        mentee_query = text("""
            SELECT COUNT(*) FROM public.mentorship_assignments
            WHERE faculty_id = :faculty_id::uuid AND is_active = true
        """)
        mentee_count = (await db.execute(mentee_query, {"faculty_id": faculty_id})).scalar() or 0

    return FacultyDashboardResponse(
        profile=faculty_profile,
        today_schedule=schedule_items,
        pending_attendance_courses=pending_attendance,
        pending_marks_count=pending_marks_count,
        mentee_count=mentee_count,
        total_classes_today=len(schedule_items),
    )


@router.get("/me/courses", response_model=List[FacultyCourseItem])
async def get_faculty_assigned_courses(
    db: AsyncSession = Depends(get_db),
    user: dict[str, Any] = Depends(require_capability("courses:manage")),
):
    """Retrieve courses assigned to the authenticated faculty member for teaching and attendance."""
    user_id = user.get("id") or user.get("sub")
    fac = await get_faculty_record_by_user_id(db, user_id)
    faculty_id = fac["faculty_id"] if fac else None

    if not faculty_id:
        # If user is admin or faculty record not yet seeded, return active courses
        courses_query = text("""
            SELECT 
                c.id, c.code, c.title, c.semester, c.credits,
                p.name as programme_name, d.name as department_name,
                COUNT(e.student_id) as total_students
            FROM public.courses c
            LEFT JOIN public.programmes p ON c.programme_id = p.id
            LEFT JOIN public.departments d ON c.department_id = d.id
            LEFT JOIN public.enrollments e ON e.course_id = c.id
            WHERE c.is_active = true
            GROUP BY c.id, c.code, c.title, c.semester, c.credits, p.name, d.name
            ORDER BY c.code ASC
        """)
        rows = (await db.execute(courses_query)).mappings().all()
    else:
        courses_query = text("""
            SELECT DISTINCT 
                c.id, c.code, c.title, c.semester, c.credits,
                p.name as programme_name, d.name as department_name,
                COUNT(e.student_id) as total_students
            FROM public.courses c
            JOIN public.timetables t ON t.course_id = c.id
            LEFT JOIN public.programmes p ON c.programme_id = p.id
            LEFT JOIN public.departments d ON c.department_id = d.id
            LEFT JOIN public.enrollments e ON e.course_id = c.id
            WHERE t.faculty_id = :faculty_id::uuid
            GROUP BY c.id, c.code, c.title, c.semester, c.credits, p.name, d.name
            ORDER BY c.code ASC
        """)
        rows = (await db.execute(courses_query, {"faculty_id": faculty_id})).mappings().all()

    return [
        FacultyCourseItem(
            id=str(r["id"]),
            code=r["code"],
            title=r["title"],
            programme_name=r["programme_name"],
            semester=r["semester"],
            department_name=r["department_name"],
            credits=r["credits"] or 4,
            total_students=r["total_students"] or 0,
        )
        for r in rows
    ]


@router.get("/courses/{course_id}/students", response_model=List[EnrolledStudentRosterItem])
async def get_course_enrolled_students(
    course_id: str,
    date_str: Optional[str] = Query(None, description="YYYY-MM-DD to check existing attendance"),
    session_str: Optional[str] = Query(None, description="FN | AN"),
    db: AsyncSession = Depends(get_db),
    user: dict[str, Any] = Depends(require_capability("attendance:mark")),
):
    """Retrieve enrolled student roster for a course with current attendance status."""
    target_date = date_str or date.today().isoformat()
    target_session = session_str or "FN"

    query = text("""
        SELECT 
            s.id as student_id,
            s.register_number,
            up.full_name,
            up.avatar_url,
            s.current_semester,
            ar.status as last_status,
            COUNT(all_ar.id) as total_classes,
            COUNT(all_ar.id) FILTER (WHERE all_ar.status IN ('present', 'od')) as attended_classes
        FROM public.enrollments e
        JOIN public.students s ON e.student_id = s.id
        JOIN public.user_profiles up ON s.user_id = up.id
        LEFT JOIN public.attendance_records ar ON ar.course_id = :course_id::uuid 
              AND ar.student_id = s.id 
              AND ar.date = :target_date::date 
              AND ar.session = :target_session
        LEFT JOIN public.attendance_records all_ar ON all_ar.course_id = :course_id::uuid 
              AND all_ar.student_id = s.id
        WHERE e.course_id = :course_id::uuid
        GROUP BY s.id, s.register_number, up.full_name, up.avatar_url, s.current_semester, ar.status
        ORDER BY s.register_number ASC
    """)
    rows = (await db.execute(query, {
        "course_id": course_id,
        "target_date": target_date,
        "target_session": target_session,
    })).mappings().all()

    roster: List[EnrolledStudentRosterItem] = []
    for r in rows:
        total = r["total_classes"] or 0
        attended = r["attended_classes"] or 0
        pct = round((attended / total * 100.0), 1) if total > 0 else 100.0

        roster.append(EnrolledStudentRosterItem(
            student_id=str(r["student_id"]),
            register_number=r["register_number"],
            full_name=r["full_name"],
            avatar_url=r["avatar_url"],
            current_semester=r["current_semester"] or 1,
            attendance_pct=pct,
            last_status=r["last_status"] or "present",
        ))

    return roster
