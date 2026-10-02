"""Tests for Phase 4 Role Dashboards (Student, Faculty, Parent, Admin)."""
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
async def test_student_dashboard_requires_auth():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/students/me/dashboard")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_student_dashboard_forbidden_for_parent(monkeypatch):
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    parent_token = create_token("p-1", "parent@test.com", "parent")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/students/me/dashboard",
            headers={"Authorization": f"Bearer {parent_token}"},
        )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_faculty_dashboard_forbidden_for_student(monkeypatch):
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    student_token = create_token("s-1", "student@test.com", "student")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/faculty/me/dashboard",
            headers={"Authorization": f"Bearer {student_token}"},
        )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_dashboard_forbidden_for_student(monkeypatch):
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    student_token = create_token("s-1", "student@test.com", "student")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/admin/dashboard",
            headers={"Authorization": f"Bearer {student_token}"},
        )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_student_dashboard_with_valid_token(monkeypatch):
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    student_token = create_token("s-100", "student@sfrc.ac.in", "student")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.mappings.return_value.first.return_value = {
        "student_id": "s-100",
        "register_number": "22UCA001",
        "current_semester": 5,
        "programme_id": "p-1",
        "programme_name": "B.Sc Computer Science",
        "department_name": "Computer Science",
        "full_name": "Divya S",
        "avatar_url": None,
        "total": 100,
        "attended": 90,
        "calculated_cgpa": 8.75,
    }
    mock_result.mappings.return_value.all.return_value = []
    mock_result.scalar.return_value = 2
    mock_db.execute.return_value = mock_result

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/students/me/dashboard",
                headers={"Authorization": f"Bearer {student_token}"},
            )
        assert response.status_code == 200
        data = response.json()
        assert "profile" in data
        assert data["profile"]["register_number"] == "22UCA001"
        assert data["attendance_pct"] == 90.0
        assert data["cgpa"] == 8.75
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_dashboard_with_admin_token(monkeypatch):
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar.return_value = 42
    mock_result.mappings.return_value.all.return_value = [
        {"id": "log-1", "name": "Computer Science", "code": "CS", "count": 120, "action": "LOGIN"}
    ]
    mock_db.execute.return_value = mock_result

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/admin/dashboard",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["student_count"] == 42
        assert data["faculty_count"] == 42
        assert data["open_complaints"] == 42
        assert len(data["dept_strength"]) == 1
    finally:
        app.dependency_overrides.pop(get_db, None)
