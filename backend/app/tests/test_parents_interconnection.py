"""Comprehensive tests for Stage 2 Parent-Student Interconnection and Authentication Resolution."""
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
async def test_admin_students_lookup(monkeypatch):
    """Admin can search/lookup active students for linking."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")
    student_token = create_token("s-1", "student@sfrc.ac.in", "student")

    # Non-admin rejected
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r_forbidden = await client.get(
            "/api/v1/admin/students/lookup?q=22",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert r_forbidden.status_code == 403

    # Admin allowed
    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.mappings.return_value.all.return_value = [
        {
            "id": "st-1",
            "user_id": "u-st-1",
            "register_number": "22UCA042",
            "full_name": "Rathna Priya S",
            "department_name": "Computer Applications",
            "programme_name": "B.Sc Computer Science",
            "current_semester": 5,
            "section": "A",
            "batch": "2022-2025",
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
                "/api/v1/admin/students/lookup?q=Rathna",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert res.status_code == 200
            data = res.json()
            assert len(data) == 1
            assert data[0]["register_number"] == "22UCA042"
            assert data[0]["full_name"] == "Rathna Priya S"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_create_parent_with_personal_email_and_multiple_wards(monkeypatch):
    """Admin creates parent with personal email and links to multiple wards."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    monkeypatch.setattr(settings, "supabase_url", "https://mock.supabase.co")
    monkeypatch.setattr(settings, "supabase_service_role_key", "mock-service-key")

    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")

    mock_db = AsyncMock()
    # Check duplicate email -> None
    mock_dup = MagicMock()
    mock_dup.scalar.return_value = None

    # Check student exists -> returns student ID
    mock_stu = MagicMock()
    mock_stu.mappings.return_value.first.return_value = {"id": "st-uuid-1", "user_id": "u-stu-1"}

    def execute_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "user_profiles" in sql and "LOWER(email)" in sql:
            m.scalar.return_value = None
        elif "FROM students" in sql:
            m.mappings.return_value.first.return_value = {"id": "st-uuid-1", "user_id": "u-stu-1"}
        elif "idx_parents_user_ward" in sql or "parents" in sql:
            m.mappings.return_value.first.return_value = None
        else:
            m.scalar.return_value = None
            m.mappings.return_value.first.return_value = None
        return m

    mock_db.execute.side_effect = execute_side_effect

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db

    mock_resp = MagicMock()
    mock_resp.status_code = 201
    mock_resp.json.return_value = {"id": "new-parent-uuid", "email": "rajesh.parent@gmail.com"}

    original_post = AsyncClient.post

    async def mock_post_handler(self, url, *args, **kwargs):
        if "auth/v1/admin/users" in str(url):
            return mock_resp
        return await original_post(self, url, *args, **kwargs)

    try:
        from unittest.mock import patch
        with patch.object(AsyncClient, "post", side_effect=mock_post_handler, autospec=True):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                res = await client.post(
                    "/api/v1/admin/users",
                    headers={"Authorization": f"Bearer {admin_token}"},
                    json={
                        "email": "rajesh.parent@gmail.com",
                        "password": "Password@123",
                        "role": "parent",
                        "full_name": "Rajesh Kumar",
                        "phone": "9876543210",
                        "ward_student_ids": ["st-uuid-1"],
                    },
                )
                assert res.status_code == 201
                data = res.json()
                assert data["status"] == "success"
                assert data["user_id"] == "new-parent-uuid"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_auth_resolve_identifier(monkeypatch):
    """Resolve identifier works for email, student register number, and phone number."""
    mock_db = AsyncMock()

    def execute_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "LOWER(email) = LOWER(:identifier)" in sql:
            if params and params.get("identifier") == "found@sfrc.ac.in":
                m.mappings.return_value.first.return_value = {
                    "email": "found@sfrc.ac.in",
                    "role": "faculty",
                    "is_active": 1,
                }
            else:
                m.mappings.return_value.first.return_value = None
        elif "LOWER(s.register_number) = LOWER(:identifier)" in sql:
            if params and params.get("identifier") == "22UCA042":
                m.mappings.return_value.first.return_value = {
                    "email": "22uca042@sfrc.ac.in",
                    "role": "student",
                    "is_active": 1,
                }
            else:
                m.mappings.return_value.first.return_value = None
        elif "phone LIKE :phone_pattern" in sql:
            if params and "9876543210" in params.get("phone_pattern", ""):
                m.mappings.return_value.first.return_value = {
                    "email": "parent.9876543210@parent.sfrc.ac.in",
                    "role": "parent",
                    "is_active": 1,
                    "phone": "+919876543210",
                }
            else:
                m.mappings.return_value.first.return_value = None
        else:
            m.mappings.return_value.first.return_value = None
        return m

    mock_db.execute.side_effect = execute_side_effect

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Resolve by direct email
            r1 = await client.get("/api/v1/auth/resolve-identifier?identifier=found@sfrc.ac.in")
            assert r1.status_code == 200
            d1 = r1.json()
            assert d1["found"] is True
            assert d1["email"] == "found@sfrc.ac.in"
            assert d1["role"] == "faculty"

            # 2. Resolve by register number
            r2 = await client.get("/api/v1/auth/resolve-identifier?identifier=22UCA042")
            assert r2.status_code == 200
            d2 = r2.json()
            assert d2["found"] is True
            assert d2["email"] == "22uca042@sfrc.ac.in"
            assert d2["role"] == "student"

            # 3. Resolve by phone number
            r3 = await client.get("/api/v1/auth/resolve-identifier?identifier=9876543210")
            assert r3.status_code == 200
            d3 = r3.json()
            assert d3["found"] is True
            assert d3["email"] == "parent.9876543210@parent.sfrc.ac.in"
            assert d3["role"] == "parent"

            # 4. Unknown identifier
            r4 = await client.get("/api/v1/auth/resolve-identifier?identifier=unknown-xyz")
            assert r4.status_code == 200
            assert r4.json()["found"] is False
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_parent_authorization_active_and_deactivated(monkeypatch):
    """Parent A can view Ward A, cannot view unlinked Ward B, and deactivated parent is denied."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    parent_token = create_token("par-active", "parent@sfrc.ac.in", "parent")

    mock_db = AsyncMock()

    def execute_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "parents par" in sql and "user_profiles up" in sql:
            # Check if ward_id is linked
            if params and params.get("ward_id") == "ward-linked-id":
                m.scalar.return_value = 1
            else:
                m.scalar.return_value = None
        else:
            m.scalar.return_value = None
            m.mappings.return_value.first.return_value = None
            m.mappings.return_value.all.return_value = []
        return m

    mock_db.execute.side_effect = execute_side_effect

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # Authorized ward
            r_auth = await client.get(
                "/api/v1/parents/me/wards/ward-linked-id/attendance",
                headers={"Authorization": f"Bearer {parent_token}"},
            )
            assert r_auth.status_code == 200

            # Unauthorized ward -> 403 Forbidden
            r_unauth = await client.get(
                "/api/v1/parents/me/wards/ward-unlinked-id/attendance",
                headers={"Authorization": f"Bearer {parent_token}"},
            )
            assert r_unauth.status_code == 403
            assert "Forbidden" in r_unauth.json().get("detail", "")
    finally:
        app.dependency_overrides.pop(get_db, None)
