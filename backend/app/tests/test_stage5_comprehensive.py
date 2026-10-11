"""Stage 5 Comprehensive End-to-End Security, Authorization, and Regression Test Suite.
Verifies all flows: Student, Faculty, Admin, and Parent Authentication,
Admin User Management, Real Parent Dashboard Data, and Strict Server-Side RBAC.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from jose import jwt
from unittest.mock import AsyncMock, MagicMock

from app.main import app
from app.core.config import settings
from app.core.database import get_db


def create_token(user_id: str, email: str, role: str) -> str:
    """Generate signed JWT token for role-based testing."""
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


# ==============================================================================
# 1. AUTHENTICATION & IDENTIFIER RESOLUTION TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_auth_resolve_student_identifier(monkeypatch):
    """Student register number resolves to institutional login email."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.mappings.return_value.first.return_value = {
        "email": "student@sfrc.ac.in",
        "role": "student",
        "is_active": 1,
    }
    mock_db.execute.return_value = mock_res

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get("/api/v1/auth/resolve-identifier?identifier=23UCA001")
            assert resp.status_code == 200
            data = resp.json()
            assert data["found"] is True
            assert data["email"] == "student@sfrc.ac.in"
            assert data["role"] == "student"
            assert data["is_active"] is True
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_auth_resolve_parent_mobile_number(monkeypatch):
    """Parent 10-digit mobile number resolves to personal email for password auth."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.mappings.return_value.first.return_value = {
        "email": "parent.user@gmail.com",
        "role": "parent",
        "is_active": 1,
    }
    mock_db.execute.return_value = mock_res

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get("/api/v1/auth/resolve-identifier?identifier=9876543210")
            assert resp.status_code == 200
            data = resp.json()
            assert data["found"] is True
            assert data["email"] == "parent.user@gmail.com"
            assert data["role"] == "parent"
            assert data["is_active"] is True
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_auth_resolve_deactivated_parent_account(monkeypatch):
    """Deactivated parent account is flagged with is_active=False."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.mappings.return_value.first.return_value = {
        "email": "inactive.parent@gmail.com",
        "role": "parent",
        "is_active": 0,
    }
    mock_db.execute.return_value = mock_res

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get("/api/v1/auth/resolve-identifier?identifier=inactive.parent@gmail.com")
            assert resp.status_code == 200
            data = resp.json()
            assert data["found"] is True
            assert data["is_active"] is False
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_auth_resolve_unknown_identifier(monkeypatch):
    """Unregistered identifier returns found=False without revealing private data."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.mappings.return_value.first.return_value = None
    mock_db.execute.return_value = mock_res

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get("/api/v1/auth/resolve-identifier?identifier=0000000000")
            assert resp.status_code == 200
            data = resp.json()
            assert data["found"] is False
            assert data["email"] is None
    finally:
        app.dependency_overrides.pop(get_db, None)


# ==============================================================================
# 2. ADMIN USER MANAGEMENT & STUDENT LOOKUP TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_admin_students_lookup_endpoint(monkeypatch):
    """Live student lookup returns actual student fields."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.mappings.return_value.all.return_value = [
        {
            "id": "stu-101",
            "user_id": "u-101",
            "register_number": "24P887CE",
            "full_name": "Ward Alpha",
            "department_name": "Computer Science",
            "programme_name": "B.Sc Computer Science",
            "current_semester": 3,
            "section": "A",
            "batch": "2023-2026",
            "is_active": 1,
        }
    ]
    mock_db.execute.return_value = mock_res

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get(
                "/api/v1/admin/students/lookup?q=Ward",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert res.status_code == 200
            data = res.json()
            assert len(data) == 1
            assert data[0]["register_number"] == "24P887CE"
            assert data[0]["current_semester"] == 3
            assert data[0]["section"] == "A"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_create_parent_duplicate_email_rejected(monkeypatch):
    """Admin cannot create a duplicate parent account with an existing email."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()
    # Check email exists -> returns existing user id
    mock_dup = MagicMock()
    mock_dup.scalar.return_value = "existing-user-id"
    mock_db.execute.return_value = mock_dup

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            payload = {
                "full_name": "Duplicate Parent",
                "email": "existing.parent@gmail.com",
                "role": "parent",
                "ward_student_ids": ["stu-101"],
            }
            res = await client.post(
                "/api/v1/admin/users",
                json=payload,
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert res.status_code == 400
            assert "already exists" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_create_parent_invalid_ward_rejected(monkeypatch):
    """Admin parent creation rejects non-existent student IDs with 404."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()
    # Check duplicate email -> None
    mock_dup = MagicMock()
    mock_dup.scalar.return_value = None

    # Check student check -> None (not found)
    mock_stu = MagicMock()
    mock_stu.mappings.return_value.first.return_value = None

    def db_execute_router(*args, **kwargs):
        sql_text = str(args[0])
        if "user_profiles WHERE email" in sql_text or "user_profiles WHERE phone" in sql_text:
            return mock_dup
        return mock_stu

    mock_db.execute.side_effect = db_execute_router

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            payload = {
                "full_name": "New Parent",
                "email": "new.parent@gmail.com",
                "role": "parent",
                "ward_student_ids": ["non-existent-student-id"],
            }
            res = await client.post(
                "/api/v1/admin/users",
                json=payload,
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert res.status_code == 404
            assert "not found" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(get_db, None)


# ==============================================================================
# 3. PARENT DASHBOARD REAL DATA & MULTI-WARD TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_parent_list_multiple_wards(monkeypatch):
    """Parent retrieves their verified linked wards with full academic attributes."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    parent_token = create_token("parent-101", "parent@gmail.com", "parent")

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.mappings.return_value.all.return_value = [
        {
            "student_id": "stu-1",
            "full_name": "Ward Alpha",
            "avatar_url": None,
            "register_number": "24P887CE",
            "current_semester": 3,
            "section": "A",
            "batch": "2023-2026",
            "programme_name": "B.Sc Computer Science",
            "department_name": "Computer Science",
            "relation": "Mother",
        },
        {
            "student_id": "stu-2",
            "full_name": "Ward Beta",
            "avatar_url": None,
            "register_number": "24P887CF",
            "current_semester": 1,
            "section": "B",
            "batch": "2024-2027",
            "programme_name": "B.Com Banking",
            "department_name": "Commerce",
            "relation": "Mother",
        },
    ]
    mock_db.execute.return_value = mock_res

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/parents/me/wards",
                headers={"Authorization": f"Bearer {parent_token}"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert len(data) == 2
            assert data[0]["register_number"] == "24P887CE"
            assert data[0]["section"] == "A"
            assert data[1]["register_number"] == "24P887CF"
            assert data[1]["section"] == "B"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_parent_ward_summary_metrics(monkeypatch):
    """Ward summary endpoint calculates attendance and absent counts accurately."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    parent_token = create_token("parent-101", "parent@gmail.com", "parent")

    mock_db = AsyncMock()
    
    # 1. verify link -> 1
    mock_link = MagicMock()
    mock_link.scalar.return_value = 1

    # 2. ward profile
    mock_ward = MagicMock()
    mock_ward.mappings.return_value.first.return_value = {
        "student_id": "stu-1",
        "user_id": "u-stu-1",
        "full_name": "Ward Alpha",
        "avatar_url": None,
        "register_number": "24P887CE",
        "current_semester": 3,
        "section": "A",
        "batch": "2023-2026",
        "programme_name": "B.Sc CS",
        "department_name": "Computer Science",
        "relation": "Mother",
    }

    # 3. attendance summary: 40 conducted, 36 attended, 4 absent
    mock_att = MagicMock()
    mock_att.mappings.return_value.first.return_value = {
        "total_classes": 40,
        "attended_classes": 36,
        "absent_classes": 4,
    }

    # 4. course attendance
    mock_crs_att = MagicMock()
    mock_crs_att.mappings.return_value.all.return_value = [
        {
            "course_id": "c-1",
            "course_code": "22UCSC31",
            "course_title": "Data Structures",
            "total_classes": 40,
            "attended_classes": 36,
        }
    ]

    # 5. marks -> 1 CIA record (obtained 45, max 50)
    mock_marks = MagicMock()
    mock_marks.mappings.return_value.all.return_value = [
        {
            "semester": 3,
            "assessment_type": "CIA1",
            "marks_obtained": 45.0,
            "max_marks": 50.0,
            "course_code": "22UCSC31",
            "course_title": "Data Structures",
            "academic_year": "2026-2027",
            "created_at": "2026-10-10",
        }
    ]

    # 6. mentor -> assigned
    mock_mentor = MagicMock()
    mock_mentor.mappings.return_value.first.return_value = {
        "mentor_name": "Dr. Ganga Devi",
        "designation": "Associate Professor",
        "department_name": "Computer Science",
        "email": "ganga.faculty@sfrc.ac.in",
        "phone": "9876543210",
    }

    # 7. hostel -> day scholar
    mock_hostel = MagicMock()
    mock_hostel.mappings.return_value.first.return_value = None

    def db_execute_router(*args, **kwargs):
        sql_text = str(args[0])
        if "parents par" in sql_text and "WHERE par.user_id = :user_id" in sql_text:
            return mock_link
        elif "FROM students s" in sql_text:
            return mock_ward
        elif "FROM attendance_records" in sql_text and "COUNT(*)" in sql_text:
            return mock_att
        elif "FROM courses c" in sql_text and "attendance_records" in sql_text:
            return mock_crs_att
        elif "FROM marks m" in sql_text:
            return mock_marks
        elif "FROM mentorship_assignments" in sql_text:
            return mock_mentor
        elif "FROM outpasses" in sql_text:
            return mock_hostel
        return MagicMock()

    mock_db.execute.side_effect = db_execute_router

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/parents/me/wards/stu-1/summary",
                headers={"Authorization": f"Bearer {parent_token}"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["attendance_pct"] == 90.0
            assert data["attendance_status"] == "good"
            assert data["total_classes"] == 40
            assert data["attended_classes"] == 36
            assert data["absent_classes"] == 4
            assert data["course_attendance"][0]["absent_classes"] == 4
            assert data["cgpa"] == 9.0  # (45/50)*10 = 9.0
            assert data["mentor"]["mentor_name"] == "Dr. Ganga Devi"
            assert data["hostel"]["is_hosteller"] is False
    finally:
        app.dependency_overrides.pop(get_db, None)


# ==============================================================================
# 4. SECURITY & AUTHORIZATION TESTS (STRICT RBAC BOUNDARIES)
# ==============================================================================

@pytest.mark.asyncio
async def test_security_unauthenticated_request_rejected():
    """Unauthenticated access to protected parent endpoints is rejected with 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/parents/me/wards")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_security_student_role_cannot_access_parent_endpoints(monkeypatch):
    """Student role cannot access parent ward endpoints (403 Forbidden)."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    student_token = create_token("stu-101", "student@sfrc.ac.in", "student")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/parents/me/wards",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 403


@pytest.mark.asyncio
async def test_security_faculty_role_cannot_access_parent_endpoints(monkeypatch):
    """Faculty role cannot access parent ward endpoints (403 Forbidden)."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    faculty_token = create_token("fac-101", "ganga.faculty@sfrc.ac.in", "faculty")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/parents/me/wards",
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        assert resp.status_code == 403


@pytest.mark.asyncio
async def test_security_unlinked_ward_access_rejected_403(monkeypatch):
    """Parent A attempting to query unlinked Student B is rejected with 403 Forbidden."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    parent_a_token = create_token("parent-A", "parentA@gmail.com", "parent")

    mock_db = AsyncMock()
    # Relationship verification query returns None
    mock_unlinked = MagicMock()
    mock_unlinked.scalar.return_value = None
    mock_db.execute.return_value = mock_unlinked

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/parents/me/wards/unlinked-student-B/summary",
                headers={"Authorization": f"Bearer {parent_a_token}"},
            )
            assert resp.status_code == 403
            assert "Forbidden" in resp.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_security_deactivated_parent_relationship_rejected(monkeypatch):
    """When a parent account is deactivated, all access to ward data is denied (403)."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    deactivated_parent_token = create_token("parent-deactivated", "inactive@gmail.com", "parent")

    mock_db = AsyncMock()
    # Relationship verification query checks par.is_active = 1, so deactivated returns None
    mock_res = MagicMock()
    mock_res.scalar.return_value = None
    mock_db.execute.return_value = mock_res

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/parents/me/wards/student-1/attendance",
                headers={"Authorization": f"Bearer {deactivated_parent_token}"},
            )
            assert resp.status_code == 403
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_security_non_admin_cannot_access_admin_user_management(monkeypatch):
    """Parent or Student role cannot access admin user management APIs (403 Forbidden)."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    parent_token = create_token("p-1", "parent@gmail.com", "parent")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {parent_token}"},
        )
        assert resp.status_code == 403
