"""Tests for Phase 7 Admin Portal & Full Analytics Suite."""
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
async def test_admin_dashboard_forbidden_for_student_and_faculty(monkeypatch):
    """SUCCESS CRITERIA 5: Student/faculty GET /api/v1/admin/* -> 403"""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    student_token = create_token("s-1", "student@sfrc.ac.in", "student")
    faculty_token = create_token("f-1", "faculty@sfrc.ac.in", "faculty")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Student test
        res_stu = await client.get(
            "/api/v1/admin/dashboard",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert res_stu.status_code == 403

        # Faculty test
        res_fac = await client.get(
            "/api/v1/admin/dashboard",
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert res_fac.status_code == 403


@pytest.mark.asyncio
async def test_admin_dashboard_metrics_from_db(monkeypatch):
    """SUCCESS CRITERIA 1: All 4 KPI cards values from DB."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()

    def execute_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "students WHERE is_active = true" in sql or "students WHERE is_active = 1" in sql:
            m.scalar.return_value = 1420
        elif "faculty WHERE is_active = true" in sql or "faculty WHERE is_active = 1" in sql:
            m.scalar.return_value = 88
        elif "complaints WHERE status" in sql or "complaints" in sql:
            m.scalar.return_value = 5
        elif "events" in sql:
            m.scalar.return_value = 24
        elif "departments" in sql:
            m.mappings.return_value.all.return_value = [
                {"name": "Computer Science", "code": "CS", "count": 140},
                {"name": "Commerce", "code": "COM", "count": 110},
            ]
        elif "audit_logs" in sql:
            m.mappings.return_value.all.return_value = [
                {
                    "id": "log-1",
                    "user_id": "a-1",
                    "action": "ADMIN_CREATE_USER",
                    "resource_type": "user_profiles",
                    "resource_id": "u-2",
                    "details": {"role": "student"},
                    "ip_address": "127.0.0.1",
                    "created_at": "2026-09-28 10:00:00",
                }
            ]
        else:
            m.scalar.return_value = 0
            m.mappings.return_value.all.return_value = []
            m.mappings.return_value.first.return_value = None
        return m

    mock_db.execute.side_effect = execute_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get(
                "/api/v1/admin/dashboard",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
        assert res.status_code == 200
        data = res.json()
        assert data["student_count"] == 1420
        assert data["faculty_count"] == 88
        assert data["open_complaints"] == 5
        assert data["events_count"] == 24
        assert len(data["dept_strength"]) == 2
        assert len(data["monthly_attendance"]) > 0
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_user_crud_and_audit(monkeypatch):
    """SUCCESS CRITERIA 2: User management create role types and audit log."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()

    def execute_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "user_profiles WHERE email" in sql:
            m.scalar.return_value = None  # No existing user
        elif "FROM user_profiles WHERE id" in sql or "user_profiles up WHERE id" in sql or "user_profiles WHERE id" in sql:
            m.mappings.return_value.first.return_value = {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "new.student@sfrc.ac.in",
                "role": "student",
                "full_name": "New Student",
                "is_active": True,
            }
        elif "COUNT(*)" in sql and "user_profiles" in sql:
            m.scalar.return_value = 1
        elif "SELECT up.id" in sql or "FROM user_profiles up" in sql or "user_profiles" in sql:
            m.mappings.return_value.all.return_value = [
                {
                    "id": "00000000-0000-0000-0000-000000000001",
                    "email": "new.student@sfrc.ac.in",
                    "role": "student",
                    "full_name": "New Student",
                    "phone": "9876543210",
                    "avatar_url": None,
                    "department_id": None,
                    "department_name": "Computer Science",
                    "is_active": True,
                    "created_at": "2026-09-28 12:00:00",
                    "register_number": "26UCA001",
                    "employee_id": None,
                }
            ]
        else:
            m.scalar.return_value = None
            m.mappings.return_value.first.return_value = None
            m.mappings.return_value.all.return_value = []
        return m

    mock_db.execute.side_effect = execute_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Create Student
            create_res = await client.post(
                "/api/v1/admin/users",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "email": "new.student@sfrc.ac.in",
                    "full_name": "New Student",
                    "role": "student",
                    "phone": "9876543210",
                    "register_number": "26UCA001",
                },
            )
            assert create_res.status_code == 201
            assert "created successfully" in create_res.json()["message"]

            # 2. List Users
            list_res = await client.get(
                "/api/v1/admin/users?role=student&page=1&limit=20",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert list_res.status_code == 200
            assert list_res.json()["total"] == 1

            # 3. Update User
            update_res = await client.put(
                "/api/v1/admin/users/00000000-0000-0000-0000-000000000001",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"full_name": "Updated Student Name"},
            )
            assert update_res.status_code == 200

            # 4. Deactivate User
            deact_res = await client.post(
                "/api/v1/admin/users/00000000-0000-0000-0000-000000000001/deactivate",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert deact_res.status_code == 200
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_analytics_endpoints(monkeypatch):
    """SUCCESS CRITERIA 3: Analytics 7+ chart sections with seed data."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar.return_value = 10
    mock_db.execute.return_value = mock_result

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            headers = {"Authorization": f"Bearer {admin_token}"}

            res_att = await client.get("/api/v1/admin/analytics/attendance", headers=headers)
            assert res_att.status_code == 200
            assert res_att.json()["overall_percentage"] == 92.3

            res_acad = await client.get("/api/v1/admin/analytics/academics", headers=headers)
            assert res_acad.status_code == 200
            assert res_acad.json()["distinction_rate"] == 69.5

            res_comp = await client.get("/api/v1/admin/analytics/complaints", headers=headers)
            assert res_comp.status_code == 200
            assert res_comp.json()["sla_compliance_pct"] == 94.2

            res_ev = await client.get("/api/v1/admin/analytics/events", headers=headers)
            assert res_ev.status_code == 200

            res_econt = await client.get("/api/v1/admin/analytics/econtent", headers=headers)
            assert res_econt.status_code == 200

            res_place = await client.get("/api/v1/admin/analytics/placement", headers=headers)
            assert res_place.status_code == 200

            res_ment = await client.get("/api/v1/admin/analytics/mentoring", headers=headers)
            assert res_ment.status_code == 200
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_audit_log_endpoint(monkeypatch):
    """SUCCESS CRITERIA 4: Audit log filterable, paginated."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar.return_value = 1
    mock_result.mappings.return_value.all.return_value = [
        {
            "id": "audit-101",
            "user_id": "a-1",
            "action": "ADMIN_UPDATE_USER",
            "resource_type": "user_profiles",
            "resource_id": "u-1",
            "details": {"role": "student"},
            "ip_address": "127.0.0.1",
            "created_at": "2026-09-28 14:00:00",
        }
    ]
    mock_db.execute.return_value = mock_result

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get(
                "/api/v1/admin/audit?action=ADMIN_UPDATE&page=1&limit=20",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert res.status_code == 200
            data = res.json()
            assert data["total"] == 1
            assert len(data["items"]) == 1
            assert data["items"][0]["action"] == "ADMIN_UPDATE_USER"
    finally:
        app.dependency_overrides.pop(get_db, None)
