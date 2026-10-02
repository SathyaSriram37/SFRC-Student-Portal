"""
Test Suite for Phase 13: Alumni Module & IQAC Quality Management
Validates server-side visibility rules, privacy enforcement (phone/email), mentorship workflows, admin verification, and IQAC security.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from jose import jwt

from app.main import app
from app.core.config import settings

def create_test_token(role: str = "student", extra_claims: dict = None) -> str:
    payload = {
        "sub": "std-2023-001" if role == "student" else "fac-2023-001" if role == "faculty" else "adm-2023-001",
        "email": f"{role}@sfrc.edu.in",
        "role": "authenticated",
        "user_metadata": {
            "role": role,
            "full_name": f"Test {role.capitalize()}",
        },
        "app_metadata": {
            "role": role,
        },
        "name": f"Test {role.capitalize()}",
        "department_code": "CS",
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
    }
    if extra_claims:
        payload.update(extra_claims)
    secret = settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890"
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_alumni_directory_visibility_and_phone_privacy():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_token = create_test_token("student")
        headers = {"Authorization": f"Bearer {student_token}"}

        # 1. Student lists directory: should see only public profiles
        res = await ac.get("/api/v1/alumni", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        items = data["items"]

        # Ensure public profiles are present
        names = [a["name"] for a in items]
        assert "Dr. Priya Sundaram" in names
        assert "Ananya Krishnan" in names

        # Ensure private profiles (e.g. Renuka Devi S., Shobana Karthikeyan) are hidden from student
        assert "Renuka Devi S." not in names
        assert "Shobana Karthikeyan" not in names

        # Ensure phone and email fields are NOT in the public response schema
        for a in items:
            assert "phone" not in a
            assert "email" not in a

        # 2. Student requesting private profile directly -> 404
        res_private = await ac.get("/api/v1/alumni/alm-08", headers=headers)
        assert res_private.status_code == 404

        # 3. Admin can access private profile directly
        admin_token = create_test_token("admin")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        res_admin = await ac.get("/api/v1/alumni/alm-08", headers=admin_headers)
        assert res_admin.status_code == 200
        assert res_admin.json()["name"] == "Renuka Devi S."


@pytest.mark.asyncio
async def test_alumni_mentorship_request_and_mentor_listing():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_token = create_test_token("student")
        headers = {"Authorization": f"Bearer {student_token}"}

        # 1. Get mentors
        res_mentors = await ac.get("/api/v1/alumni/mentors", headers=headers)
        assert res_mentors.status_code == 200
        mentors = res_mentors.json()
        assert len(mentors) >= 2
        assert all(m["is_mentor"] is True for m in mentors)

        # 2. Student sends mentorship request to Dr. Priya Sundaram (alm-01)
        req_payload = {
            "preferred_topic": "System Architecture",
            "message": "Hello Dr. Priya, I would like to seek your mentorship on large scale systems.",
        }
        res_req = await ac.post("/api/v1/alumni/mentorship/request/alm-01", json=req_payload, headers=headers)
        assert res_req.status_code == 201
        req_data = res_req.json()
        assert req_data["alumni_id"] == "alm-01"
        assert req_data["status"] == "pending"


@pytest.mark.asyncio
async def test_admin_alumni_verification():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_token = create_test_token("admin")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Verify alm-09 (Shobana Karthikeyan)
        res_verify = await ac.put("/api/v1/alumni/admin/alm-09/verify", headers=admin_headers)
        assert res_verify.status_code == 200
        assert res_verify.json()["is_verified"] is True

        # Student cannot verify profiles -> 403
        student_token = create_test_token("student")
        res_fail = await ac.put("/api/v1/alumni/admin/alm-09/verify", headers={"Authorization": f"Bearer {student_token}"})
        assert res_fail.status_code == 403


@pytest.mark.asyncio
async def test_iqac_endpoints_access_control():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Student attempt -> 403 Forbidden
        student_token = create_test_token("student")
        headers_student = {"Authorization": f"Bearer {student_token}"}

        res_meet_fail = await ac.get("/api/v1/admin/iqac/meetings", headers=headers_student)
        assert res_meet_fail.status_code == 403

        res_dash_fail = await ac.get("/api/v1/admin/iqac/dashboard", headers=headers_student)
        assert res_dash_fail.status_code == 403

        # 2. Admin success -> 200 OK
        admin_token = create_test_token("admin")
        headers_admin = {"Authorization": f"Bearer {admin_token}"}

        res_dash = await ac.get("/api/v1/admin/iqac/dashboard", headers=headers_admin)
        assert res_dash.status_code == 200
        dash_data = res_dash.json()
        assert dash_data["total_meetings"] >= 3
        assert dash_data["active_initiatives"] >= 2
        assert dash_data["pending_action_items"] >= 3

        res_meet = await ac.get("/api/v1/admin/iqac/meetings", headers=headers_admin)
        assert res_meet.status_code == 200
        assert len(res_meet.json()["items"]) >= 3


@pytest.mark.asyncio
async def test_iqac_action_items_status_update():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_token = create_test_token("admin")
        headers_admin = {"Authorization": f"Bearer {admin_token}"}

        # 1. List action items
        res_items = await ac.get("/api/v1/admin/iqac/action-items", headers=headers_admin)
        assert res_items.status_code == 200
        items = res_items.json()
        assert len(items) >= 5

        # 2. Update status of act-03 to "Completed"
        update_payload = {
            "status": "Completed",
            "evidence_url": "https://sfrc.edu.in/iqac/evidence/ACIDE_Kiosk_Photo.pdf",
            "remarks": "Inaugurated by Principal with 7 student startups.",
        }
        res_upd = await ac.put("/api/v1/admin/iqac/action-items/act-03", json=update_payload, headers=headers_admin)
        assert res_upd.status_code == 200
        upd_data = res_upd.json()
        assert upd_data["status"] == "Completed"
        assert upd_data["evidence_url"] == update_payload["evidence_url"]
