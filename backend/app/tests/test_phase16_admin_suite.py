"""Phase 16 Test Suite — Admin Governance, User Management, Analytics Suite, Audit Logs, and Student Profile APIs."""
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from jose import jwt
from unittest.mock import AsyncMock, MagicMock
import uuid

from app.main import app
from app.core.config import settings
from app.core.database import get_db


def create_test_token(role: str = "student", user_id: str = None, extra_claims: dict = None) -> str:
    sub = user_id or ("00000000-0000-0000-0000-000000000001" if role == "student" else "00000000-0000-0000-0000-000000000004")
    payload = {
        "sub": sub,
        "email": f"{role}@sfrc.edu.in",
        "role": "authenticated",
        "user_metadata": {
            "role": role,
            "full_name": "Karpagam S" if role == "student" else "System Administrator",
            "register_number": "22UCA042" if role == "student" else None,
        },
        "app_metadata": {
            "role": role,
        },
        "name": "Karpagam S" if role == "student" else "System Administrator",
        "register_number": "22UCA042" if role == "student" else None,
        "department_code": "CS",
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
    }
    if extra_claims:
        payload.update(extra_claims)
    secret = settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890"
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture
def mock_db_session():
    mock_db = AsyncMock()

    user_profile_data = {
        "id": "00000000-0000-0000-0000-000000000001",
        "email": "student@sfrc.edu.in",
        "role": "student",
        "full_name": "Karpagam S",
        "phone": "+91 9876543210",
        "avatar_url": None,
        "department_id": "00000000-0000-0000-0000-000000000010",
        "department_name": "Computer Science",
        "is_active": True,
        "created_at": "2026-06-01T00:00:00Z",
        "register_number": "22UCA042",
        "employee_id": None,
    }

    student_data = {
        "student_id": "00000000-0000-0000-0000-000000000011",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "register_number": "22UCA042",
        "full_name": "Karpagam S",
        "email": "student@sfrc.edu.in",
        "phone": "+91 9876543210",
        "avatar_url": None,
        "date_of_birth": "2004-05-14",
        "blood_group": "B+",
        "address": "42 South Car Street, Sivakasi",
        "emergency_contact": "+91 9123456780",
        "current_semester": 5,
        "batch": "2022-2025",
        "section": "A",
        "department_name": "Computer Applications",
        "programme_name": "B.C.A Computer Applications",
        "degree_level": "Undergraduate (UG)",
        "regulation_year": 2022,
        "admission_year": 2022,
        "mentor_name": "Dr. S. Meenakshi",
        "abc_id": "ABC-9823-1102-4521",
        "apaar_id": "APAAR-2022-TN-042",
        "preferences": {"email_notifications": True, "sms_alerts": False},
    }

    def execute_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "audit_logs" in sql:
            m.scalar.return_value = 1
            m.mappings.return_value.all.return_value = [
                {
                    "id": "00000000-0000-0000-0000-000000000099",
                    "user_id": "00000000-0000-0000-0000-000000000004",
                    "action": "ADMIN_CREATE_USER",
                    "resource_type": "user_profiles",
                    "resource_id": "u-2",
                    "details": {"role": "student"},
                    "ip_address": "127.0.0.1",
                    "created_at": "2026-09-28T10:00:00Z",
                }
            ]
        elif "user_profiles" in sql:
            m.scalar.return_value = 1
            m.mappings.return_value.all.return_value = [user_profile_data]
            m.mappings.return_value.first.return_value = user_profile_data
        elif "students WHERE is_active = true" in sql or "students WHERE is_active = 1" in sql:
            m.scalar.return_value = 1420
        elif "faculty WHERE is_active = true" in sql or "faculty WHERE is_active = 1" in sql:
            m.scalar.return_value = 88
        elif "complaints WHERE status" in sql or "complaints" in sql:
            m.scalar.return_value = 5
        elif "departments" in sql:
            m.mappings.return_value.all.return_value = [
                {"name": "Computer Science", "code": "CS", "count": 140},
                {"name": "Commerce", "code": "COM", "count": 110},
            ]
        elif "students" in sql:
            m.mappings.return_value.first.return_value = student_data
        elif "events" in sql:
            m.scalar.return_value = 24
        elif "attendance_records" in sql:
            m.mappings.return_value.first.return_value = {"total": 100, "attended": 92}
        elif "marks" in sql:
            m.mappings.return_value.first.return_value = {"gpa": 8.75}
        else:
            m.scalar.return_value = 0
            m.mappings.return_value.all.return_value = []
            m.mappings.return_value.first.return_value = {"id": "dummy", "total": 1, "attended": 1, "gpa": 8.5}
        return m

    mock_db.execute.side_effect = execute_side_effect
    return mock_db


@pytest.fixture
def student_auth_headers():
    token = create_test_token(role="student")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers():
    token = create_test_token(role="admin")
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_admin_dashboard_metrics(admin_auth_headers, mock_db_session):
    """Test 1: Admin dashboard returns live metric summaries, department strengths, and audit history."""
    async def override_db():
        yield mock_db_session

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/v1/admin/dashboard", headers=admin_auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["student_count"] == 1420
            assert data["faculty_count"] == 88
            assert data["open_complaints"] == 5
            assert "dept_strength" in data
            assert isinstance(data["dept_strength"], list)
            assert "monthly_attendance" in data
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_user_management_listing(admin_auth_headers, student_auth_headers, mock_db_session):
    """Test 2: Admin can list and search users, students are forbidden (403)."""
    async def override_db():
        yield mock_db_session

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # Student access blocked
            std_res = await ac.get("/api/v1/admin/users", headers=student_auth_headers)
            assert std_res.status_code == 403

            # Admin access success
            adm_res = await ac.get("/api/v1/admin/users?role=student&page=1&limit=10", headers=admin_auth_headers)
            assert adm_res.status_code == 200
            data = adm_res.json()
            assert "data" in data
            assert "total" in data
            assert "page" in data
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_analytics_suite_endpoints(admin_auth_headers, mock_db_session):
    """Test 3: Verify all 7 analytics suite endpoints return structured JSON."""
    async def override_db():
        yield mock_db_session

    app.dependency_overrides[get_db] = override_db
    endpoints = [
        "/api/v1/admin/analytics/attendance",
        "/api/v1/admin/analytics/academics",
        "/api/v1/admin/analytics/complaints",
        "/api/v1/admin/analytics/events",
        "/api/v1/admin/analytics/econtent",
        "/api/v1/admin/analytics/placement",
        "/api/v1/admin/analytics/mentoring",
    ]
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            for ep in endpoints:
                res = await ac.get(ep, headers=admin_auth_headers)
                assert res.status_code == 200, f"Failed at {ep}: {res.text}"
                assert isinstance(res.json(), dict)
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_audit_logs_filter(admin_auth_headers, mock_db_session):
    """Test 4: Admin audit log endpoint supports action query and pagination."""
    async def override_db():
        yield mock_db_session

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.get("/api/v1/admin/audit?page=1&limit=15", headers=admin_auth_headers)
            assert res.status_code == 200
            data = res.json()
            assert "items" in data
            assert len(data["items"]) >= 1
            assert data["items"][0]["action"] == "ADMIN_CREATE_USER"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_student_profile_and_preferences(student_auth_headers, mock_db_session):
    """Test 5: Student can retrieve and update their detailed profile and preference flags."""
    async def override_db():
        yield mock_db_session

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # Get profile
            get_res = await ac.get("/api/v1/students/me/profile", headers=student_auth_headers)
            assert get_res.status_code == 200
            profile = get_res.json()
            assert profile["full_name"] == "Karpagam S"
            assert profile["register_number"] == "22UCA042"
            assert profile["abc_id"].startswith("ABC-")

            # Update profile
            put_res = await ac.put(
                "/api/v1/students/me/profile",
                json={
                    "phone_number": "+91 9876543210",
                    "emergency_contact": "+91 9123456780",
                    "blood_group": "B+",
                    "permanent_address": "42 South Car Street, Sivakasi",
                },
                headers=student_auth_headers,
            )
            assert put_res.status_code == 200
            assert "student_id" in put_res.json()

            # Update preferences
            pref_res = await ac.put(
                "/api/v1/students/me/preferences",
                json={
                    "email_notifications": True,
                    "sms_alerts": False,
                    "exam_reminders": True,
                    "attendance_threshold_alerts": True,
                    "fee_payment_alerts": True,
                },
                headers=student_auth_headers,
            )
            assert pref_res.status_code == 200
            assert pref_res.json()["status"] == "success"
    finally:
        app.dependency_overrides.pop(get_db, None)
