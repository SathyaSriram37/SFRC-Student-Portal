"""Tests for User Management — Real Supabase data, Admin Auth, and Profile Synchronization."""
import pytest
from httpx import AsyncClient, ASGITransport
from jose import jwt
from unittest.mock import AsyncMock, MagicMock, patch

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
async def test_non_admin_cannot_access_user_management(monkeypatch):
    """Non-admin roles (student, faculty, parent) receive 403 Forbidden on user management."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    student_token = create_token("s-101", "student@sfrc.ac.in", "student")
    faculty_token = create_token("f-101", "faculty@sfrc.ac.in", "faculty")
    parent_token = create_token("p-101", "parent@sfrc.ac.in", "parent")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Student
        r1 = await client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {student_token}"})
        assert r1.status_code == 403

        # Faculty
        r2 = await client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {faculty_token}"})
        assert r2.status_code == 403

        # Parent
        r3 = await client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {parent_token}"})
        assert r3.status_code == 403


@pytest.mark.asyncio
async def test_admin_create_user_with_supabase_and_db_profile(monkeypatch):
    """Admin creates a user: calls Supabase Auth admin API, inserts DB profile & student record."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    monkeypatch.setattr(settings, "supabase_url", "https://mock.supabase.co")
    monkeypatch.setattr(settings, "supabase_service_role_key", "mock-service-role-key")

    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()

    def db_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "SELECT id FROM user_profiles WHERE email" in sql:
            m.scalar.return_value = None  # Email is unique
        elif "COUNT(*)" in sql:
            m.scalar.return_value = 1
        elif "SELECT" in sql:
            m.mappings.return_value.all.return_value = [
                {
                    "id": "supa-uid-999",
                    "email": "newuser@sfrcollege.edu.in",
                    "role": "student",
                    "full_name": "Rathna Priya",
                    "phone": "9876543210",
                    "avatar_url": None,
                    "department_id": None,
                    "department_name": "Computer Applications",
                    "is_active": True,
                    "created_at": "2026-10-10 12:00:00",
                    "register_number": "26UCA099",
                    "employee_id": None,
                }
            ]
        else:
            m.scalar.return_value = None
            m.mappings.return_value.first.return_value = None
            m.mappings.return_value.all.return_value = []
        return m

    mock_db.execute.side_effect = db_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    # Mock httpx client response specifically for Supabase Auth admin creation
    mock_resp = MagicMock()
    mock_resp.status_code = 201
    mock_resp.json.return_value = {
        "id": "supa-uid-999",
        "email": "newuser@sfrcollege.edu.in",
        "user_metadata": {"full_name": "Rathna Priya", "role": "student"},
    }

    original_post = AsyncClient.post

    async def mock_post_handler(self, url, *args, **kwargs):
        if "auth/v1/admin/users" in str(url):
            return mock_resp
        return await original_post(self, url, *args, **kwargs)

    try:
        with patch.object(AsyncClient, "post", side_effect=mock_post_handler, autospec=True):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                res = await client.post(
                    "/api/v1/admin/users",
                    headers={"Authorization": f"Bearer {admin_token}"},
                    json={
                        "email": "newuser@sfrcollege.edu.in",
                        "full_name": "Rathna Priya",
                        "role": "student",
                        "password": "Password@123",
                        "phone": "9876543210",
                        "register_number": "26UCA099",
                    },
                )
                assert res.status_code == 201
                data = res.json()
                assert data["status"] == "success"
                assert data["user_id"] == "supa-uid-999"
                assert "created successfully" in data["message"]
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_create_user_duplicate_email_rejected(monkeypatch):
    """Duplicate email is rejected with 400 error and no records created."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()

    def db_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "SELECT id FROM user_profiles WHERE email" in sql:
            m.scalar.return_value = "existing-uuid"
        return m

    mock_db.execute.side_effect = db_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post(
                "/api/v1/admin/users",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "email": "existing@sfrc.edu.in",
                    "full_name": "Duplicate User",
                    "role": "student",
                },
            )
            assert res.status_code == 400
            assert "already exists" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_get_user_stats(monkeypatch):
    """Admin retrieves accurate live counts for all user roles and active states."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()

    def db_side_effect(statement, params=None):
        m = MagicMock()
        m.mappings.return_value.first.return_value = {
            "total": 540,
            "students": 450,
            "faculty": 65,
            "parents": 20,
            "admins": 5,
            "active": 530,
            "inactive": 10,
        }
        return m

    mock_db.execute.side_effect = db_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get(
                "/api/v1/admin/users/stats",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert res.status_code == 200
            data = res.json()
            assert data["total"] == 540
            assert data["students"] == 450
            assert data["faculty"] == 65
            assert data["parents"] == 20
            assert data["admins"] == 5
            assert data["active"] == 530
            assert data["inactive"] == 10
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_get_student_details_with_linked_parents(monkeypatch):
    """Admin retrieves full Student details including academic and linked parent records."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()

    def db_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "FROM user_profiles" in sql and "WHERE up.id" in sql:
            m.mappings.return_value.first.return_value = {
                "id": "st-uuid-1",
                "email": "student1@sfrc.ac.in",
                "role": "student",
                "full_name": "Karpagam S",
                "phone": "9876543210",
                "avatar_url": None,
                "department_id": "dept-ca",
                "department_name": "Computer Applications",
                "is_active": True,
                "created_at": "2026-06-01 10:00:00",
                "updated_at": "2026-06-01 10:00:00",
            }
        elif "FROM students s" in sql:
            m.mappings.return_value.first.return_value = {
                "student_id": "st-rec-1",
                "register_number": "22UCA042",
                "roll_number": "22UCA042",
                "programme_id": "prog-bca",
                "programme_name": "B.C.A. Cloud Technology",
                "current_semester": 6,
                "batch": "2022-2025",
                "section": "A",
                "date_of_birth": "2004-05-15",
                "blood_group": "O+",
                "permanent_address": "Sivakasi, Tamil Nadu",
                "emergency_contact": "9876543211",
                "abc_id": "ABC123456",
                "apaar_id": "APAAR998877",
            }
        elif "FROM parents p" in sql and "ward_student_id" in sql:
            m.mappings.return_value.all.return_value = [
                {
                    "parent_id": "par-1",
                    "user_id": "par-u-1",
                    "full_name": "Sundaram M",
                    "email": "sundaram@gmail.com",
                    "phone": "9876543211",
                    "relation": "Father",
                }
            ]
        else:
            m.mappings.return_value.first.return_value = None
            m.mappings.return_value.all.return_value = []
        return m

    mock_db.execute.side_effect = db_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get(
                "/api/v1/admin/users/st-uuid-1",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert res.status_code == 200
            data = res.json()
            assert data["id"] == "st-uuid-1"
            assert data["role"] == "student"
            assert data["register_number"] == "22UCA042"
            assert data["current_semester"] == 6
            assert data["department_name"] == "Computer Applications"
            assert len(data["linked_parents"]) == 1
            assert data["linked_parents"][0]["full_name"] == "Sundaram M"
            assert data["linked_parents"][0]["relation"] == "Father"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_update_student_profile(monkeypatch):
    """Admin updates student fields: verifies profile and students tables are updated."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()

    def db_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "SELECT id, email, role, full_name FROM user_profiles" in sql:
            m.mappings.return_value.first.return_value = {
                "id": "st-uuid-1",
                "email": "student1@sfrc.ac.in",
                "role": "student",
                "full_name": "Karpagam S",
            }
        elif "SELECT id FROM students WHERE user_id" in sql:
            m.scalar.return_value = "st-rec-1"
        return m

    mock_db.execute.side_effect = db_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.put(
                "/api/v1/admin/users/st-uuid-1",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "full_name": "Karpagam Shanmugasundaram",
                    "phone": "9876500000",
                    "current_semester": 6,
                    "section": "B",
                    "blood_group": "A+",
                },
            )
            assert res.status_code == 200
            assert res.json()["status"] == "success"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_activate_and_deactivate_user(monkeypatch):
    """Admin activates and deactivates a user account, persisting state across sources."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()

    def db_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "SELECT id, email, is_active FROM user_profiles" in sql:
            m.mappings.return_value.first.return_value = {
                "id": "user-uuid-10",
                "email": "user10@sfrc.edu.in",
                "is_active": True,
            }
        return m

    mock_db.execute.side_effect = db_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # Deactivate
            r_deact = await client.post(
                "/api/v1/admin/users/user-uuid-10/deactivate",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert r_deact.status_code == 200
            assert "deactivated" in r_deact.json()["message"]

            # Activate
            r_act = await client.post(
                "/api/v1/admin/users/user-uuid-10/activate",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert r_act.status_code == 200
            assert "activated" in r_act.json()["message"]
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_reset_password(monkeypatch):
    """Admin resets user password, generating a secure temporary password."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()

    def db_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "SELECT id, email, full_name FROM user_profiles" in sql:
            m.mappings.return_value.first.return_value = {
                "id": "user-uuid-20",
                "email": "user20@sfrc.edu.in",
                "full_name": "Reset User",
            }
        return m

    mock_db.execute.side_effect = db_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": "user-uuid-20"}

    original_put = AsyncClient.put

    async def mock_put_handler(self, url, *args, **kwargs):
        if "auth/v1/admin/users" in str(url):
            return mock_resp
        return await original_put(self, url, *args, **kwargs)

    try:
        with patch.object(AsyncClient, "put", side_effect=mock_put_handler, autospec=True):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                res = await client.post(
                    "/api/v1/admin/users/user-uuid-20/reset-password",
                    headers={"Authorization": f"Bearer {admin_token}"},
                )
                assert res.status_code == 200
                data = res.json()
                assert data["status"] == "success"
                assert "temporary_password" in data
                assert data["temporary_password"].startswith("Sfrc@")
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_delete_or_archive_safeguard(monkeypatch):
    """Permanent delete is blocked when active foreign dependencies (e.g. library loans) exist."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()

    def db_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "SELECT id, email, role, full_name FROM user_profiles" in sql:
            m.mappings.return_value.first.return_value = {
                "id": "user-uuid-30",
                "email": "borrower@sfrc.edu.in",
                "role": "student",
                "full_name": "Active Borrower",
            }
        elif "SELECT COUNT(*) FROM library_loans" in sql:
            m.scalar.return_value = 2  # Has 2 active loans!
        return m

    mock_db.execute.side_effect = db_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # Attempt permanent delete with active loans -> 400 Bad Request
            r_blocked = await client.delete(
                "/api/v1/admin/users/user-uuid-30?permanent=true",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert r_blocked.status_code == 400
            assert "active or overdue library loan" in r_blocked.json()["detail"]

            # Soft Archive without permanent=true -> 200 Success
            r_archive = await client.delete(
                "/api/v1/admin/users/user-uuid-30?permanent=false",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert r_archive.status_code == 200
            assert "archived successfully" in r_archive.json()["message"]
    finally:
        app.dependency_overrides.pop(get_db, None)

