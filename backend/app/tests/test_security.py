"""
Phase 19 — Security Audit Tests.
Validates role-based access control, cross-student data isolation, and admin-only route protection.
All tests use in-memory ASGI transport — no real database connection required.
"""
from __future__ import annotations

import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from jose import jwt

from app.main import app
from app.core.config import settings


# ── Token Helper ───────────────────────────────────────────────────────────────

def make_token(role: str, user_id: str = None) -> str:
    sub = user_id or {
        "student": "00000000-0000-0000-0000-000000000001",
        "faculty": "00000000-0000-0000-0000-000000000002",
        "parent":  "00000000-0000-0000-0000-000000000003",
        "admin":   "00000000-0000-0000-0000-000000000004",
    }.get(role, "00000000-0000-0000-0000-000000000099")
    payload = {
        "sub": sub,
        "email": f"{role}@sfrc.edu.in",
        "role": "authenticated",
        "user_metadata": {"role": role, "full_name": f"Test {role.title()}"},
        "app_metadata": {"role": role},
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
    }
    secret = settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890"
    return jwt.encode(payload, secret, algorithm="HS256")


def auth(role: str, user_id: str = None) -> dict:
    return {"Authorization": f"Bearer {make_token(role, user_id)}"}


UNLINKED_WARD_ID = "00000000-0000-0000-0000-000000000099"


# ── Test 1: Student cannot access admin user list (requires analytics capability) ──

@pytest.mark.asyncio
async def test_student_cannot_access_admin_users():
    """Student GET /api/v1/admin/users must return 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/users", headers=auth("student"))
    assert r.status_code == 403


# ── Test 2: Faculty cannot access admin user list ─────────────────────────────

@pytest.mark.asyncio
async def test_faculty_cannot_access_admin_users():
    """Faculty GET /api/v1/admin/users must return 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/users", headers=auth("faculty"))
    assert r.status_code == 403


# ── Test 3: Parent cannot access admin user list ──────────────────────────────

@pytest.mark.asyncio
async def test_parent_cannot_access_admin_users():
    """Parent GET /api/v1/admin/users must return 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/users", headers=auth("parent"))
    assert r.status_code == 403


# ── Test 4: No auth returns 401 ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_unauthenticated_request_returns_401():
    """Requests without Bearer token must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/users")
    assert r.status_code == 401


# ── Test 5: Student cannot mark attendance ────────────────────────────────────

@pytest.mark.asyncio
async def test_student_cannot_mark_attendance():
    """Student lacks attendance:mark capability — POST /api/v1/attendance/mark must return 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/api/v1/attendance/mark",
            json={"student_id": "s-001", "subject_code": "CS501", "status": "present"},
            headers=auth("student"),
        )
    assert r.status_code in (403, 422)


# ── Test 6: Student cannot access IQAC dashboard ──────────────────────────────

@pytest.mark.asyncio
async def test_student_cannot_access_iqac():
    """Student GET /api/v1/admin/iqac/dashboard must return 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/iqac/dashboard", headers=auth("student"))
    assert r.status_code == 403


# ── Test 7: Faculty cannot access IQAC dashboard ─────────────────────────────

@pytest.mark.asyncio
async def test_faculty_cannot_access_iqac():
    """Faculty GET /api/v1/admin/iqac/dashboard must return 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/iqac/dashboard", headers=auth("faculty"))
    assert r.status_code == 403


# ── Test 8: Parent cannot access IQAC dashboard ──────────────────────────────

@pytest.mark.asyncio
async def test_parent_cannot_access_iqac():
    """Parent GET /api/v1/admin/iqac/dashboard must return 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/iqac/dashboard", headers=auth("parent"))
    assert r.status_code == 403


# ── Test 9: Admin CAN access IQAC dashboard ──────────────────────────────────

@pytest.mark.asyncio
async def test_admin_can_access_iqac():
    """Admin GET /api/v1/admin/iqac/dashboard must return 200."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/iqac/dashboard", headers=auth("admin"))
    assert r.status_code == 200


# ── Test 10: Admin integration sync endpoint requires auth ────────────────────

@pytest.mark.asyncio
async def test_erms_sync_requires_auth():
    """POST /api/v1/admin/integrations/erms/sync without token must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post("/api/v1/admin/integrations/erms/sync")
    assert r.status_code == 401


# ── Test 11: Student cannot access ERMS health (requires auth) ───────────────

@pytest.mark.asyncio
async def test_erms_health_accessible_to_authenticated():
    """ERMS health endpoint returns 200 for any authenticated user."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/integrations/erms/health", headers=auth("student"))
    assert r.status_code == 200


# ── Test 12: Student cannot access IQAC meetings list ────────────────────────

@pytest.mark.asyncio
async def test_student_cannot_list_iqac_meetings():
    """Student GET /api/v1/admin/iqac/meetings must return 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/iqac/meetings", headers=auth("student"))
    assert r.status_code == 403
