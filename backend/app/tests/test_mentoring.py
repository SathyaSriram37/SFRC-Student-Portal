"""Tests for Phase 8 Mentoring System & Privacy Guarantees."""
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
async def test_faculty_adds_meeting_with_personal_notes(monkeypatch):
    """SUCCESS CRITERIA 1: Faculty adds meeting with personal_notes -> saved in DB."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    faculty_token = create_token("f-101", "faculty@sfrc.ac.in", "faculty")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.mappings.return_value.first.return_value = {"id": "00000000-0000-0000-0000-000000000099"}
    mock_db.execute.return_value = mock_result

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post(
                "/api/v1/mentoring/records",
                headers={"Authorization": f"Bearer {faculty_token}"},
                json={
                    "student_id": "00000000-0000-0000-0000-000000000001",
                    "meeting_date": "2026-09-24",
                    "meeting_type": "Academic & Welfare Counseling",
                    "academic_notes": "Student improved DBMS CIA score to 46/50.",
                    "personal_notes": "CONFIDENTIAL: Student struggling with hostel adjustment; warden notified.",
                    "goals": "Achieve 90%+ attendance in Semester 5.",
                    "follow_up": "Check mental wellbeing next Tuesday.",
                    "next_meeting": "2026-10-14",
                },
            )
            assert res.status_code == 201
            data = res.json()
            assert data["status"] == "success"
            assert "record_id" in data
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_student_my_mentor_strictly_excludes_personal_notes(monkeypatch):
    """SUCCESS CRITERIA 2: GET /api/v1/mentoring/my-mentor -> JSON has NO personal_notes field."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    student_token = create_token("s-201", "student@sfrc.ac.in", "student")

    mock_db = AsyncMock()

    def execute_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "FROM public.students WHERE user_id" in sql:
            m.mappings.return_value.first.return_value = {"id": "00000000-0000-0000-0000-000000000001"}
        elif "FROM public.mentorship_assignments" in sql:
            m.mappings.return_value.first.return_value = {
                "mentor_name": "Dr. K. Anitha",
                "designation": "Associate Professor",
                "department_name": "Computer Science",
                "email": "anitha.k@sfrc.ac.in",
                "phone": "04562-220389",
            }
        elif "FROM public.mentoring_records" in sql:
            m.mappings.return_value.all.return_value = [
                {
                    "id": "rec-1",
                    "meeting_date": "2026-09-24",
                    "meeting_type": "Routine Academic Review",
                    "goals": "Maintain 90%+ attendance in Computer Networks.",
                    "follow_up": "Check progress next session.",
                    "next_meeting": "2026-10-14",
                }
            ]
        else:
            m.mappings.return_value.first.return_value = None
            m.mappings.return_value.all.return_value = []
        return m

    mock_db.execute.side_effect = execute_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get(
                "/api/v1/mentoring/my-mentor",
                headers={"Authorization": f"Bearer {student_token}"},
            )
            assert res.status_code == 200
            data = res.json()
            assert data["mentor_name"] == "Dr. K. Anitha"
            assert "recent_meetings" in data
            # Check top level
            assert "personal_notes" not in data
            assert "private_notes" not in data
            # Check meeting items
            for meeting in data["recent_meetings"]:
                assert "personal_notes" not in meeting
                assert "private_notes" not in meeting
                assert "academic_notes" not in meeting  # private faculty field
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_mentoring_goals_crud(monkeypatch):
    """SUCCESS CRITERIA 3: Goal tracker: add + update status works."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    student_token = create_token("s-201", "student@sfrc.ac.in", "student")

    mock_db = AsyncMock()

    def execute_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "FROM public.students WHERE user_id" in sql:
            m.mappings.return_value.first.return_value = {"id": "00000000-0000-0000-0000-000000000001"}
        elif "FROM public.mentoring_goals" in sql:
            m.mappings.return_value.all.return_value = [
                {
                    "id": "g-1",
                    "student_id": "00000000-0000-0000-0000-000000000001",
                    "title": "Complete AWS Cloud Practitioner Certification",
                    "description": "Modules 1 to 6",
                    "target_date": "2026-10-30",
                    "status": "in_progress",
                    "created_at": "2026-09-20 10:00:00",
                }
            ]
        else:
            m.mappings.return_value.first.return_value = None
            m.mappings.return_value.all.return_value = []
        return m

    mock_db.execute.side_effect = execute_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Create Goal
            create_res = await client.post(
                "/api/v1/mentoring/goals",
                headers={"Authorization": f"Bearer {student_token}"},
                json={
                    "student_id": "00000000-0000-0000-0000-000000000001",
                    "title": "Complete AWS Certification",
                    "description": "Pass test",
                    "target_date": "2026-10-30",
                },
            )
            assert create_res.status_code == 201

            # 2. Get Goals
            get_res = await client.get(
                "/api/v1/mentoring/my-goals",
                headers={"Authorization": f"Bearer {student_token}"},
            )
            assert get_res.status_code == 200
            goals = get_res.json()
            assert len(goals) == 1
            assert goals[0]["title"] == "Complete AWS Cloud Practitioner Certification"

            # 3. Update Goal Status
            patch_res = await client.patch(
                "/api/v1/mentoring/goals/00000000-0000-0000-0000-000000000001/status",
                headers={"Authorization": f"Bearer {student_token}"},
                json={"status": "completed"},
            )
            assert patch_res.status_code == 200
            assert patch_res.json()["new_status"] == "completed"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_student_forbidden_from_faculty_mentee_endpoints(monkeypatch):
    """SUCCESS CRITERIA 4: Student JWT forbidden from accessing faculty mentee records."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    student_token = create_token("s-201", "student@sfrc.ac.in", "student")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Student attempting to list all mentees
        res_list = await client.get(
            "/api/v1/mentoring/my-mentees",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert res_list.status_code == 403

        # 2. Student attempting to view another's meeting records with private notes
        res_rec = await client.get(
            "/api/v1/mentoring/mentees/00000000-0000-0000-0000-000000000001/records",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert res_rec.status_code == 403


@pytest.mark.asyncio
async def test_admin_mentoring_load(monkeypatch):
    """Admin mentor load endpoint returns dept-wise load table."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar.return_value = 0
    mock_result.mappings.return_value.all.return_value = [
        {
            "faculty_id": "fac-1",
            "faculty_name": "Dr. K. Anitha",
            "department_name": "Computer Science",
            "mentees_count": 18,
            "last_activity_date": "2026-09-24",
        }
    ]
    mock_db.execute.return_value = mock_result

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get(
                "/api/v1/mentoring/admin/load",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert res.status_code == 200
            data = res.json()
            assert len(data["mentor_loads"]) == 1
            assert data["mentor_loads"][0]["faculty_name"] == "Dr. K. Anitha"
    finally:
        app.dependency_overrides.pop(get_db, None)
