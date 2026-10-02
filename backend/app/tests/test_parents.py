"""Tests for Phase 6 Parent Portal API Endpoints & Security."""
import pytest
from httpx import AsyncClient, ASGITransport
from jose import jwt
from unittest.mock import AsyncMock, MagicMock

from app.main import app
from app.core.config import settings
from app.core.database import get_db


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "user_metadata": {
            "role": role,
            "full_name": f"Test {role.capitalize()}",
        },
        "app_metadata": {
            "role": role,
        },
    }
    return jwt.encode(payload, settings.supabase_jwt_secret or "test-secret-12345", algorithm="HS256")


@pytest.mark.asyncio
async def test_parent_endpoints_require_auth():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/parents/me/wards")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_parent_endpoints_forbidden_for_students(monkeypatch):
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    student_token = create_token("s-100", "student@sfrc.ac.in", "student")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(
            "/api/v1/parents/me/wards",
            headers={"Authorization": f"Bearer {student_token}"},
        )
    # student role doesn't have attendance:view_ward capability
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_parent_summary_forbidden_for_unlinked_ward(monkeypatch):
    """SUCCESS CRITERIA 1: Test GET /api/v1/parents/me/wards/{UNLINKED_UUID}/summary -> 403"""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    parent_token = create_token("par-1", "parent@sfrc.ac.in", "parent")

    mock_db = AsyncMock()
    # Mock verify_parent_ward_link query returning None/empty
    mock_result = MagicMock()
    mock_result.scalar.return_value = None  # Link check fails
    mock_db.execute.return_value = mock_result

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get(
                "/api/v1/parents/me/wards/00000000-0000-0000-0000-000000000099/summary",
                headers={"Authorization": f"Bearer {parent_token}"},
            )
        assert res.status_code == 403
        assert "Forbidden" in res.json().get("detail", "")
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_parent_summary_success_for_linked_ward(monkeypatch):
    """Test GET /api/v1/parents/me/wards/{LINKED_UUID}/summary -> 200 with complete data"""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    parent_token = create_token("par-1", "parent@sfrc.ac.in", "parent")

    mock_db = AsyncMock()
    
    # Sequence of database executions
    def execute_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "parent_student" in sql:
            # 1. Link verification passes
            m.scalar.return_value = 1
        elif "FROM public.students" in sql:
            # 2. Ward profile
            m.mappings.return_value.first.return_value = {
                "student_id": "00000000-0000-0000-0000-000000000001",
                "full_name": "Rathna Priya S",
                "register_number": "22UCA042",
                "current_semester": 5,
                "programme_name": "B.Sc Computer Science",
                "department_name": "Computer Science",
                "avatar_url": None,
            }
        elif "COUNT(*) FILTER (WHERE status IN ('present', 'od'))" in sql and "FROM public.attendance_records" in sql and "enrollments" not in sql:
            # 3. Overall attendance
            m.mappings.return_value.first.return_value = {
                "total": 120,
                "attended": 105,
            }
        elif "FROM public.enrollments" in sql:
            # 4. Course attendance
            m.mappings.return_value.all.return_value = [
                {
                    "course_id": "c-1",
                    "course_code": "20UCSC51",
                    "course_title": "Database Management Systems",
                    "total_classes": 40,
                    "attended_classes": 36,
                },
                {
                    "course_id": "c-2",
                    "course_code": "20UCSC52",
                    "course_title": "Web Technology",
                    "total_classes": 40,
                    "attended_classes": 28,
                }
            ]
        elif "calculated_cgpa" in sql:
            # 5. Marks CGPA
            m.mappings.return_value.first.return_value = {"calculated_cgpa": 8.75}
        elif "FROM public.marks" in sql and "assessment_type" in sql:
            # 6. Recent updates
            m.mappings.return_value.all.return_value = [
                {
                    "title": "CIA 2",
                    "description": "Scored 45/50 in 20UCSC51",
                    "timestamp": "2026-09-20 10:00:00",
                }
            ]
        elif "FROM public.mentorship_assignments" in sql:
            # 7. Mentor info (No private notes)
            m.mappings.return_value.first.return_value = {
                "mentor_name": "Dr. K. Anitha",
                "designation": "Associate Professor",
                "department_name": "Computer Science",
                "email": "anitha.k@sfrc.ac.in",
                "phone": "04562-220389",
            }
        elif "FROM public.hostel_allocations" in sql:
            # 8. Hostel allocation
            m.mappings.return_value.first.return_value = {
                "hostel_name": "Thamarai Hostel",
                "room_number": "B-204",
                "warden_name": "Mrs. S. Meenakshi",
                "warden_contact": "04562-220380",
            }
        else:
            m.mappings.return_value.first.return_value = None
            m.mappings.return_value.all.return_value = []
            m.scalar.return_value = None
        return m

    mock_db.execute.side_effect = execute_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get(
                "/api/v1/parents/me/wards/00000000-0000-0000-0000-000000000001/summary",
                headers={"Authorization": f"Bearer {parent_token}"},
            )
        assert res.status_code == 200
        data = res.json()
        assert data["ward"]["full_name"] == "Rathna Priya S"
        assert data["ward"]["register_number"] == "22UCA042"
        assert data["attendance_pct"] == 87.5
        assert data["attendance_status"] == "good"
        assert data["cgpa"] == 8.75
        assert len(data["course_attendance"]) == 2
        assert data["mentor"]["mentor_name"] == "Dr. K. Anitha"
        assert data["hostel"]["is_hosteller"] is True
        assert data["hostel"]["hostel_name"] == "Thamarai Hostel"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_parent_performance_and_mentor(monkeypatch):
    """Test performance and mentor contact endpoints with verified ward."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    parent_token = create_token("par-1", "parent@sfrc.ac.in", "parent")

    mock_db = AsyncMock()

    def execute_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "parent_student" in sql:
            m.scalar.return_value = 1
        elif "GROUP BY semester" in sql:
            m.mappings.return_value.all.return_value = [
                {"semester": 1, "gpa": 8.2},
                {"semester": 2, "gpa": 8.5},
                {"semester": 3, "gpa": 8.8},
            ]
        elif "FROM public.marks" in sql:
            m.mappings.return_value.all.return_value = [
                {
                    "course_code": "20UCSC51",
                    "course_title": "DBMS",
                    "assessment_type": "CIA 1",
                    "marks_obtained": 48.0,
                    "max_marks": 50.0,
                }
            ]
        elif "FROM public.mentorship_assignments" in sql:
            m.mappings.return_value.first.return_value = {
                "mentor_name": "Dr. K. Anitha",
                "designation": "Associate Professor",
                "department_name": "Computer Science",
                "email": "anitha.k@sfrc.ac.in",
                "phone": "04562-220389",
            }
        else:
            m.mappings.return_value.first.return_value = None
            m.mappings.return_value.all.return_value = []
            m.scalar.return_value = None
        return m

    mock_db.execute.side_effect = execute_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            perf_res = await client.get(
                "/api/v1/parents/me/wards/00000000-0000-0000-0000-000000000001/performance",
                headers={"Authorization": f"Bearer {parent_token}"},
            )
            assert perf_res.status_code == 200
            p_data = perf_res.json()
            assert p_data["cgpa"] == 8.5
            assert len(p_data["semester_gpas"]) == 3

            mentor_res = await client.get(
                "/api/v1/parents/me/wards/00000000-0000-0000-0000-000000000001/mentor",
                headers={"Authorization": f"Bearer {parent_token}"},
            )
            assert mentor_res.status_code == 200
            m_data = mentor_res.json()
            assert m_data["mentor_name"] == "Dr. K. Anitha"
            # Ensure no private notes in response
            assert "notes" not in m_data
            assert "private_notes" not in m_data
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_parent_notices_filter_audience(monkeypatch):
    """SUCCESS CRITERIA 5: Notices filtered by audience='parent'."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    parent_token = create_token("par-1", "parent@sfrc.ac.in", "parent")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.mappings.return_value.all.return_value = [
        {
            "id": "not-1",
            "title": "Parent Teachers Association Meeting - Odd Sem 2026",
            "content": "PTA meeting is scheduled for 15th Oct 2026 in the Multipurpose Hall.",
            "priority": "high",
            "publish_from": "2026-09-28T09:00:00",
        }
    ]
    mock_db.execute.return_value = mock_result

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get(
                "/api/v1/parents/me/notices",
                headers={"Authorization": f"Bearer {parent_token}"},
            )
        assert res.status_code == 200
        notices = res.json()
        assert len(notices) == 1
        assert "Parent Teachers Association" in notices[0]["title"]
    finally:
        app.dependency_overrides.pop(get_db, None)
