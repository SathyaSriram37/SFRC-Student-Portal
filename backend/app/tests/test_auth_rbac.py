"""Unit and integration tests for Authentication, RBAC, and Capabilities."""
import pytest
from httpx import AsyncClient, ASGITransport
from jose import jwt
from fastapi import FastAPI, Depends, HTTPException

from app.main import app
from app.core.config import settings
from app.core.security import get_current_user, require_role, require_roles
from app.core.capabilities import has_capability, get_capabilities_for_role, require_capability, CAPABILITIES


def create_test_token(user_id: str, email: str, role: str) -> str:
    """Generate a test JWT matching Supabase token structure."""
    payload = {
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "user_metadata": {
            "role": role,
            "full_name": f"Test {role.capitalize()}",
        },
        "app_metadata": {
            "provider": "email",
            "role": role,
        },
    }
    return jwt.encode(payload, settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890", algorithm="HS256")


# ── Capabilities Matrix Tests ───────────────────────────────────────────────

def test_admin_has_wildcard_capability():
    assert has_capability("admin", "*") is True
    assert has_capability("admin", "attendance:mark") is True
    assert has_capability("admin", "any:arbitrary:action") is True


def test_faculty_capabilities():
    caps = get_capabilities_for_role("faculty")
    assert "attendance:mark" in caps
    assert "marks:enter" in caps
    assert has_capability("faculty", "attendance:mark") is True
    assert has_capability("faculty", "attendance:view") is True
    assert has_capability("faculty", "fees:view_ward") is False


def test_student_capabilities():
    caps = get_capabilities_for_role("student")
    assert "attendance:view" in caps
    assert "marks:view" in caps
    assert "complaints:create" in caps
    assert has_capability("student", "attendance:view") is True
    assert has_capability("student", "attendance:mark") is False


def test_parent_capabilities():
    caps = get_capabilities_for_role("parent")
    assert "attendance:view_ward" in caps
    assert "marks:view_ward" in caps
    assert has_capability("parent", "attendance:view_ward") is True
    assert has_capability("parent", "marks:enter") is False


# ── FastAPI Endpoint & Dependency Tests ───────────────────────────────────────

@pytest.mark.asyncio
async def test_auth_me_with_valid_jwt(monkeypatch):
    secret = "test-jwt-secret-key-1234567890"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)

    token = create_test_token("u-123", "student@sfrc.ac.in", "student")
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/auth/me", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "u-123"
    assert data["email"] == "student@sfrc.ac.in"
    assert data["role"] == "student"
    assert "attendance:view" in data["capabilities"]
    assert "attendance:mark" not in data["capabilities"]


@pytest.mark.asyncio
async def test_faculty_role_protected_dependency(monkeypatch):
    secret = "test-jwt-secret-key-1234567890"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)

    test_app = FastAPI()

    @test_app.get("/faculty-only")
    async def faculty_only(user=Depends(require_role("faculty"))):
        return {"status": "ok", "user": user["id"]}

    student_token = create_test_token("s-1", "student@sfrc.ac.in", "student")
    faculty_token = create_test_token("f-1", "faculty@sfrc.ac.in", "faculty")
    admin_token = create_test_token("a-1", "admin@sfrc.ac.in", "admin")

    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        # Student should get 403
        r_student = await client.get("/faculty-only", headers={"Authorization": f"Bearer {student_token}"})
        assert r_student.status_code == 403

        # Faculty should get 200
        r_faculty = await client.get("/faculty-only", headers={"Authorization": f"Bearer {faculty_token}"})
        assert r_faculty.status_code == 200

        # Admin should get 200
        r_admin = await client.get("/faculty-only", headers={"Authorization": f"Bearer {admin_token}"})
        assert r_admin.status_code == 200


@pytest.mark.asyncio
async def test_capability_dependency_checker(monkeypatch):
    secret = "test-jwt-secret-key-1234567890"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)

    test_app = FastAPI()

    @test_app.post("/mark-attendance")
    async def mark_attendance(user=Depends(require_capability("attendance:mark"))):
        return {"status": "marked"}

    student_token = create_test_token("s-1", "student@sfrc.ac.in", "student")
    faculty_token = create_test_token("f-1", "faculty@sfrc.ac.in", "faculty")

    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        # Student lacks attendance:mark
        r_student = await client.post("/mark-attendance", headers={"Authorization": f"Bearer {student_token}"})
        assert r_student.status_code == 403
        assert "attendance:mark" in r_student.json()["detail"]

        # Faculty has attendance:mark
        r_faculty = await client.post("/mark-attendance", headers={"Authorization": f"Bearer {faculty_token}"})
        assert r_faculty.status_code == 200
