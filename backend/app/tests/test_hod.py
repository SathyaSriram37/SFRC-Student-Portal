"""
Test HOD Portal Endpoints (Module 3 & Phase 9 Analytics)
Validates HOD overview, faculty oversight, student risk flagging,
attendance report, marks report, and the 6 Master Production Prompt analytics charts.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from jose import jwt
import uuid

from app.main import app
from app.core.config import settings


def create_token(role: str = "hod", extra_claims: dict = None) -> str:
    sub_id = f"{role[:3]}-{uuid.uuid4().hex[:6]}"
    payload = {
        "sub": sub_id,
        "email": f"{sub_id}@sfrc.edu.in",
        "role": "authenticated",
        "user_metadata": {
            "role": role,
            "full_name": "Dr. R. Meenakshi" if role == "hod" else "Kavitha R",
        },
        "app_metadata": {
            "role": role,
        },
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
    }
    if extra_claims:
        payload.update(extra_claims)
    secret = settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890"
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_hod_overview_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        token = create_token("hod")
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.get("/api/v1/hod/overview", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "department" in data
        assert "stats" in data
        stats = data["stats"]
        assert "total_active_students" in stats
        assert "total_faculty" in stats
        assert "avg_attendance_pct" in stats
        assert "avg_marks_pct" in stats
        assert stats["total_active_students"] >= 0


@pytest.mark.asyncio
async def test_hod_faculty_list():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        token = create_token("hod")
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.get("/api/v1/hod/faculty", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "faculty" in data
        assert isinstance(data["faculty"], list)
        if len(data["faculty"]) > 0:
            first_f = data["faculty"][0]
            assert "full_name" in first_f
            assert "employee_id" in first_f
            assert "assigned_subjects" in first_f


@pytest.mark.asyncio
async def test_hod_students_and_risk_flagging():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        token = create_token("hod")
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.get("/api/v1/hod/students", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "students" in data
        assert isinstance(data["students"], list)
        if len(data["students"]) > 0:
            s = data["students"][0]
            assert "register_number" in s
            assert "attendance_pct" in s
            assert "marks_pct" in s
            assert "is_at_risk" in s


@pytest.mark.asyncio
async def test_hod_attendance_report():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        token = create_token("hod")
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.get("/api/v1/hod/attendance-report", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "courses" in data
        assert "report" in data
        assert "summary" in data
        assert "class_average_pct" in data["summary"]


@pytest.mark.asyncio
async def test_hod_marks_report():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        token = create_token("hod")
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.get("/api/v1/hod/marks-report?assessment_type=CIA1", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "records" in data
        assert "summary" in data
        assert "pass_percentage" in data["summary"]
        assert "class_average" in data["summary"]


@pytest.mark.asyncio
async def test_hod_analytics_charts():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        token = create_token("hod")
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.get("/api/v1/hod/analytics/charts", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "chart1_attendance_per_student" in data
        assert "chart2_marks_per_subject" in data
        assert "chart3_attendance_split" in data
        assert "chart4_marks_trend" in data
        assert "chart5_below_75_students" in data
        assert "chart6_subject_pass_fail" in data


@pytest.mark.asyncio
async def test_hod_security_student_forbidden():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_token = create_token("student")
        headers = {"Authorization": f"Bearer {student_token}"}

        res = await ac.get("/api/v1/hod/overview", headers=headers)
        assert res.status_code == 403
