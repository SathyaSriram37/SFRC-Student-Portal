"""
Test Suite for Phase 14: Policies & Compliance Center
Validates:
1. Student sees 4 published policies (not 2 draft policies)
2. Policy acknowledgement recording & confirmation
3. Pending policies endpoint returns correct pending acknowledgements
4. Grievance submission with validation (min 50 chars) returns reference number (e.g. GRV-00001)
5. Anonymous grievance masks personal identity in admin dashboard
6. Admin can publish draft policy -> becomes immediately visible in student endpoint
7. Student direct access to draft policy is forbidden (403/404)
"""

import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from jose import jwt

from app.main import app
from app.core.config import settings

def create_test_token(role: str = "student", user_id: str = None, extra_claims: dict = None) -> str:
    sub = user_id or ("std-2026-001" if role == "student" else "fac-2026-001" if role == "faculty" else "adm-2026-001")
    payload = {
        "sub": sub,
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
async def test_student_policy_catalog_isolation():
    """Verify student gets 4 published policies, and cannot see or access 2 draft policies."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_token = create_test_token("student", user_id="student-test-p14")
        headers = {"Authorization": f"Bearer {student_token}"}

        # 1. Student lists policies
        res = await ac.get("/api/v1/policies", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "policies" in data
        policies = data["policies"]

        # Ensure all returned policies are published
        for p in policies:
            assert p["status"] == "published"

        policy_ids = [p["id"] for p in policies]
        assert "pol-001" in policy_ids  # Anti-Ragging (published)
        assert "pol-002" in policy_ids  # IT Policy (published)
        assert "pol-003" in policy_ids  # Exam Rules (published)
        assert "pol-004" in policy_ids  # Hostel Rules (published)

        # Draft policies MUST NOT be in the listing
        assert "pol-005" not in policy_ids  # Library Rules (draft)
        assert "pol-006" not in policy_ids  # Code of Conduct (draft)

        # 2. Student attempts direct access to draft policy pol-005 -> 403 Forbidden
        res_draft = await ac.get("/api/v1/policies/pol-005", headers=headers)
        assert res_draft.status_code == 403


@pytest.mark.asyncio
async def test_policy_acknowledgement_and_pending_flow():
    """Verify policy acknowledgement workflow and pending banner calculation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        user_id = "student-ack-user-99"
        student_token = create_test_token("student", user_id=user_id)
        headers = {"Authorization": f"Bearer {student_token}"}

        # 1. Check pending policies: should have pol-001 and pol-002 (published & requires_acknowledgement=True)
        res_pending = await ac.get("/api/v1/policies/me/pending", headers=headers)
        assert res_pending.status_code == 200
        pending_data = res_pending.json()
        pending_ids = [p["id"] for p in pending_data["pending_policies"]]
        assert "pol-001" in pending_ids
        assert "pol-002" in pending_ids
        initial_pending_count = pending_data["total_pending"]
        assert initial_pending_count >= 2

        # 2. Acknowledge pol-001
        res_ack = await ac.post("/api/v1/policies/pol-001/acknowledge", headers=headers)
        assert res_ack.status_code == 200
        ack_data = res_ack.json()
        assert ack_data["acknowledged"] is True
        assert ack_data["policy_id"] == "pol-001"
        assert "acknowledged_at" in ack_data

        # 3. Check pending policies again: pol-001 must no longer be pending
        res_pending_after = await ac.get("/api/v1/policies/me/pending", headers=headers)
        assert res_pending_after.status_code == 200
        pending_after_data = res_pending_after.json()
        pending_after_ids = [p["id"] for p in pending_after_data["pending_policies"]]
        assert "pol-001" not in pending_after_ids
        assert pending_after_data["total_pending"] == initial_pending_count - 1

        # 4. Detail view shows is_acknowledged=True for pol-001
        res_detail = await ac.get("/api/v1/policies/pol-001", headers=headers)
        assert res_detail.status_code == 200
        assert res_detail.json()["is_acknowledged"] is True


@pytest.mark.asyncio
async def test_grievance_submission_and_anonymous_redaction():
    """Verify grievance creation validation, reference format, and anonymous privacy in admin view."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_id = "student-grv-user-42"
        student_token = create_test_token("student", user_id=student_id)
        admin_token = create_test_token("admin", user_id="admin-user-01")

        # 1. Validation failure: description less than 50 chars
        short_payload = {
            "category": "Academic",
            "subject": "CIA Retest Inquiry",
            "description": "Too short",
            "is_anonymous": False,
        }
        res_fail = await ac.post("/api/v1/grievances", json=short_payload, headers={"Authorization": f"Bearer {student_token}"})
        assert res_fail.status_code == 422

        # 2. Successful anonymous submission with >50 chars description
        valid_payload = {
            "category": "Ragging",
            "subject": "Hostel Corridor Safety Concern",
            "description": "Reporting an aggressive senior interaction observed near the second floor hostel study lounge after evening attendance check.",
            "is_anonymous": True,
        }
        res_sub = await ac.post("/api/v1/grievances", json=valid_payload, headers={"Authorization": f"Bearer {student_token}"})
        assert res_sub.status_code == 200
        sub_data = res_sub.json()
        assert "reference" in sub_data
        assert sub_data["reference"].startswith("GRV-")
        grv_id = sub_data["id"]

        # 3. Student views own grievances: sees the grievance
        res_my = await ac.get("/api/v1/grievances/me", headers={"Authorization": f"Bearer {student_token}"})
        assert res_my.status_code == 200
        my_grvs = res_my.json()["grievances"]
        assert any(g["id"] == grv_id for g in my_grvs)

        # 4. Admin views grievances: anonymous student identity is masked
        res_adm = await ac.get("/api/v1/admin/grievances", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_adm.status_code == 200
        adm_grvs = res_adm.json()["grievances"]
        target = next((g for g in adm_grvs if g["id"] == grv_id), None)
        assert target is not None
        assert target["reporter_name"] == "Anonymous Student"
        assert target["reporter_id"] == "ANON-REDACTED"

        # 5. Admin updates grievance status to 'Under Review'
        status_payload = {
            "status": "Under Review",
            "admin_response_notes": "Referred to Anti-Ragging Squad Warden for swift review.",
        }
        res_update = await ac.put(f"/api/v1/admin/grievances/{grv_id}/status", json=status_payload, headers={"Authorization": f"Bearer {admin_token}"})
        assert res_update.status_code == 200
        assert res_update.json()["status"] == "Under Review"


@pytest.mark.asyncio
async def test_admin_policy_management_and_publish_flow():
    """Verify admin policy creation, update, and publish transition affecting student visibility."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_token = create_test_token("admin", user_id="admin-super-01")
        student_token = create_test_token("student", user_id="student-view-01")

        # 1. Admin creates a new draft policy
        create_payload = {
            "title": "Green Campus & Sustainability Charter",
            "category": "Green Campus",
            "version": "1.0",
            "audience": "all",
            "requires_acknowledgement": False,
            "effective_date": "2026-08-01",
            "description": "Standard operating guidelines for single-use plastic ban, solar energy usage, and rainwater harvesting on campus.",
            "content": "As per SFRC official policy. All departments and hostels must comply with environmental compliance standards.",
            "status": "draft",
        }
        res_create = await ac.post("/api/v1/admin/policies", json=create_payload, headers={"Authorization": f"Bearer {admin_token}"})
        assert res_create.status_code == 200
        created_policy = res_create.json()
        new_pol_id = created_policy["id"]

        # 2. Student should NOT see this draft in catalog
        res_std = await ac.get("/api/v1/policies", headers={"Authorization": f"Bearer {student_token}"})
        std_ids = [p["id"] for p in res_std.json()["policies"]]
        assert new_pol_id not in std_ids

        # 3. Admin publishes the draft policy
        res_pub = await ac.post(f"/api/v1/admin/policies/{new_pol_id}/publish", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_pub.status_code == 200
        assert res_pub.json()["status"] == "published"

        # 4. Student now sees the published policy
        res_std_after = await ac.get("/api/v1/policies", headers={"Authorization": f"Bearer {student_token}"})
        std_after_ids = [p["id"] for p in res_std_after.json()["policies"]]
        assert new_pol_id in std_after_ids
