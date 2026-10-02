"""Tests for Phase 5 Academics & Examination Module."""
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
async def test_student_attendance_endpoint(monkeypatch):
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    student_token = create_token("s-101", "student@sfrc.ac.in", "student")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.mappings.return_value.first.return_value = {
        "student_id": "s-101",
        "programme_id": "p-1",
        "current_semester": 6,
        "full_name": "Divya S",
    }
    mock_result.mappings.return_value.all.return_value = [
        {
            "course_id": "c-1",
            "course_code": "22UCSC61",
            "course_title": "Cloud Architecture",
            "classes_held": 40,
            "classes_attended": 36,
        },
        {
            "course_id": "c-2",
            "course_code": "22UCSC62",
            "course_title": "Web Application Dev",
            "classes_held": 40,
            "classes_attended": 24,  # 60% -> below 75%
        },
    ]
    mock_db.execute.return_value = mock_result

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/students/me/attendance",
                headers={"Authorization": f"Bearer {student_token}"},
            )
        assert response.status_code == 200
        data = response.json()
        assert len(data["courses"]) == 2
        assert data["courses"][0]["percentage"] == 90.0
        assert data["courses"][0]["status"] == "good"
        assert data["courses"][1]["percentage"] == 60.0
        assert data["courses"][1]["status"] == "danger"
        assert len(data["shortage_alerts"]) >= 1
        assert "22UCSC62" in data["shortage_alerts"][0]
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_marks_boundary_validation_fails(monkeypatch):
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    faculty_token = create_token("f-1", "faculty@sfrc.ac.in", "faculty")

    payload = {
        "course_id": "c-1",
        "assessment_type": "CIA1",
        "academic_year": "2026-2027",
        "semester": 6,
        "records": [
            {
                "student_id": "s-1",
                "marks_obtained": 105.0,  # Invalid: > max_marks (100)
                "max_marks": 100.0,
            }
        ],
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/marks/enter",
            json=payload,
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
    assert response.status_code == 400
    assert "boundary" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_attendance_mark_success(monkeypatch):
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    faculty_token = create_token("f-1", "faculty@sfrc.ac.in", "faculty")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.mappings.return_value.first.return_value = {"id": "fac-1"}
    mock_db.execute.return_value = mock_result

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    payload = {
        "course_id": "c-1",
        "date": "2026-10-01",
        "session": "FN",
        "records": [
            {"student_id": "s-1", "status": "present"},
            {"student_id": "s-2", "status": "absent"},
        ],
    }

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/attendance/mark",
                json=payload,
                headers={"Authorization": f"Bearer {faculty_token}"},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["marked_count"] == 2
    finally:
        app.dependency_overrides.pop(get_db, None)
