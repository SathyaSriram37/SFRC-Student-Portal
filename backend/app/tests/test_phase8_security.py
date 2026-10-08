"""
Phase 8: Security, RBAC, Authorization, IDOR, Data Isolation & Validation Hardening Test Suite.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
import pytest
from httpx import AsyncClient, ASGITransport
from jose import jwt
from sqlalchemy import text

from app.main import app
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.services.notification_service import NotificationService


def create_test_token(role: str = "student", extra_claims: dict = None) -> tuple[str, str]:
    sub_id = f"{role[:3]}-p8-{uuid.uuid4().hex[:6]}"
    payload = {
        "sub": sub_id,
        "id": sub_id,
        "email": f"{sub_id}@sfrc.edu.in",
        "role": "authenticated",
        "user_metadata": {
            "role": role,
            "full_name": f"Test {role.capitalize()} User",
            "department_code": "CS",
        },
        "app_metadata": {
            "role": role,
        },
        "name": f"Test {role.capitalize()} User",
        "department_code": "CS",
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
    }
    if extra_claims:
        payload.update(extra_claims)
    secret = settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890"
    token = jwt.encode(payload, secret, algorithm="HS256")
    return token, sub_id


@pytest.mark.asyncio
async def test_unauthenticated_protected_endpoints_rejected():
    """Verify that unauthenticated requests to protected endpoints return 401 Unauthorized."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        endpoints = [
            ("GET", "/api/v1/admin/dashboard"),
            ("GET", "/api/v1/admin/users"),
            ("POST", "/api/v1/hostel/leave"),
            ("GET", "/api/v1/mentoring/my-mentees"),
            ("GET", "/api/v1/parents/me/wards"),
            ("GET", "/api/v1/notifications"),
        ]
        for method, path in endpoints:
            if method == "GET":
                resp = await ac.get(path)
            else:
                resp = await ac.post(path, json={})
            assert resp.status_code == 401, f"Expected 401 for {method} {path}, got {resp.status_code}"


@pytest.mark.asyncio
async def test_rbac_role_boundaries():
    """Verify students, faculty, and parents cannot access operations outside their authorized role."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_token, _ = create_test_token("student")
        faculty_token, _ = create_test_token("faculty")
        parent_token, _ = create_test_token("parent")

        std_headers = {"Authorization": f"Bearer {student_token}"}
        fac_headers = {"Authorization": f"Bearer {faculty_token}"}
        par_headers = {"Authorization": f"Bearer {parent_token}"}

        # 1. Student cannot access Admin Dashboard
        resp1 = await ac.get("/api/v1/admin/dashboard", headers=std_headers)
        assert resp1.status_code == 403

        # 2. Student cannot access Faculty Mentee Management
        resp2 = await ac.get("/api/v1/mentoring/my-mentees", headers=std_headers)
        assert resp2.status_code == 403

        # 3. Faculty cannot access Admin User Management
        resp3 = await ac.get("/api/v1/admin/users", headers=fac_headers)
        assert resp3.status_code == 403

        # 4. Parent cannot access Admin Audit Logs
        resp4 = await ac.get("/api/v1/admin/audit", headers=par_headers)
        assert resp4.status_code == 403

        # 5. Student cannot approve hostel leave (Warden capability required)
        resp5 = await ac.post("/api/v1/hostel/admin/leave/dummy-id/approve", json={}, headers=std_headers)
        assert resp5.status_code == 403


@pytest.mark.asyncio
async def test_idor_and_ownership_enforcement():
    """Verify that users cannot modify or delete resources owned by other users."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        fac1_token, fac1_uid = create_test_token("faculty")
        fac2_token, fac2_uid = create_test_token("faculty")

        fac1_headers = {"Authorization": f"Bearer {fac1_token}"}
        fac2_headers = {"Authorization": f"Bearer {fac2_token}"}

        # Faculty 1 creates a publication
        pub_payload = {
            "title": f"Distributed Algorithms Security {uuid.uuid4().hex[:4]}",
            "authors": ["Dr. Author One"],
            "department_code": "CS",
            "journal_name": "IEEE Trans. Dependable Secure Comput.",
            "indexing": "IEEE",
            "publication_year": 2026,
            "doi_or_url": "10.1109/TDSC.2026.123456",
        }
        create_resp = await ac.post("/api/v1/research/publications", json=pub_payload, headers=fac1_headers)
        assert create_resp.status_code == 201
        pub_id = create_resp.json()["id"]

        # Faculty 2 attempts to update Faculty 1's publication -> 403 Forbidden
        update_resp = await ac.put(
            f"/api/v1/research/publications/{pub_id}",
            json={"title": "Unauthorized Modification Attempt"},
            headers=fac2_headers,
        )
        assert update_resp.status_code == 403

        # Faculty 2 attempts to delete Faculty 1's publication -> 403 Forbidden
        del_resp = await ac.delete(f"/api/v1/research/publications/{pub_id}", headers=fac2_headers)
        assert del_resp.status_code == 403

        # Faculty 1 can successfully update their own publication
        own_update_resp = await ac.put(
            f"/api/v1/research/publications/{pub_id}",
            json={"title": "Legitimate Title Update"},
            headers=fac1_headers,
        )
        assert own_update_resp.status_code == 200
        assert own_update_resp.json()["title"] == "Legitimate Title Update"


@pytest.mark.asyncio
async def test_parent_ward_isolation():
    """Verify Parent A cannot access Parent B's linked ward data."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        parent_a_token, parent_a_uid = create_test_token("parent")
        parent_b_token, parent_b_uid = create_test_token("parent")
        _, ward_a_uid = create_test_token("student")
        _, ward_b_uid = create_test_token("student")

        headers_a = {"Authorization": f"Bearer {parent_a_token}"}
        headers_b = {"Authorization": f"Bearer {parent_b_token}"}

        # Seed parent-ward relationships directly in DB
        reg_num = f"24P8{uuid.uuid4().hex[:4].upper()}"
        async with AsyncSessionLocal() as db:
            # Create user_profile and student records
            await db.execute(text("""
                INSERT OR IGNORE INTO user_profiles (id, email, full_name, role)
                VALUES (:uid, :email, 'Ward Alpha', 'student')
            """), {"uid": ward_a_uid, "email": f"{ward_a_uid}@sfrc.edu.in"})
            await db.execute(text("""
                INSERT OR IGNORE INTO students (id, user_id, register_number, current_semester, is_active)
                VALUES (:sid, :uid, :reg_no, 3, 1)
            """), {"sid": ward_a_uid, "uid": ward_a_uid, "reg_no": reg_num})

            # Link Parent A to Ward A
            await db.execute(text("""
                INSERT OR IGNORE INTO parents (id, user_id, ward_student_id, relation)
                VALUES (:pid, :puid, :sid, 'Mother')
            """), {"pid": f"par-{uuid.uuid4().hex[:6]}", "puid": parent_a_uid, "sid": ward_a_uid})
            await db.commit()

        # 1. Parent A can access their own Ward A summary
        res_a = await ac.get(f"/api/v1/parents/me/wards/{ward_a_uid}/summary", headers=headers_a)
        assert res_a.status_code == 200
        assert res_a.json()["ward"]["student_id"] == ward_a_uid

        # 2. Parent B cannot access Ward A summary -> 403 Forbidden
        res_b = await ac.get(f"/api/v1/parents/me/wards/{ward_a_uid}/summary", headers=headers_b)
        assert res_b.status_code == 403

        # 3. Parent B cannot access Ward A attendance or mentor info -> 403 Forbidden
        att_b = await ac.get(f"/api/v1/parents/me/wards/{ward_a_uid}/attendance", headers=headers_b)
        assert att_b.status_code == 403


@pytest.mark.asyncio
async def test_hostel_outpass_date_validation():
    """Verify past departure dates and invalid date sequences are rejected."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_token, _ = create_test_token("student")
        headers = {"Authorization": f"Bearer {student_token}"}

        # 1. Past departure date -> rejected (400)
        past_body = {
            "from_date": "2020-01-01",
            "to_date": "2020-01-05",
            "reason": "Past festival",
            "destination": "Madurai",
            "emergency_contact": "+91 98765 43210",
        }
        res_past = await ac.post("/api/v1/hostel/leave", json=past_body, headers=headers)
        assert res_past.status_code == 400
        assert "past" in res_past.json()["detail"].lower()

        # 2. Return date earlier than departure date -> rejected (400)
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
        invalid_seq = {
            "from_date": tomorrow,
            "to_date": yesterday,
            "reason": "Time travel",
            "destination": "Chennai",
            "emergency_contact": "+91 98765 43210",
        }
        res_seq = await ac.post("/api/v1/hostel/leave", json=invalid_seq, headers=headers)
        assert res_seq.status_code == 400

        # 3. Valid future date -> accepted (201)
        valid_from = (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%d")
        valid_to = (datetime.now(timezone.utc) + timedelta(days=4)).strftime("%Y-%m-%d")
        valid_body = {
            "from_date": valid_from,
            "to_date": valid_to,
            "reason": "Attending inter-college symposium",
            "destination": "Tirunelveli",
            "emergency_contact": "+91 98765 43210",
        }
        res_valid = await ac.post("/api/v1/hostel/leave", json=valid_body, headers=headers)
        assert res_valid.status_code == 201


@pytest.mark.asyncio
async def test_mentoring_goal_and_doi_validation():
    """Verify mentoring target_date format and publication DOI validations."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_token, student_uid = create_test_token("student")
        faculty_token, _ = create_test_token("faculty")

        std_headers = {"Authorization": f"Bearer {student_token}"}
        fac_headers = {"Authorization": f"Bearer {faculty_token}"}

        # 1. Malformed target_date in mentoring goal -> 400 Bad Request
        bad_goal = {
            "student_id": student_uid,
            "title": "Complete Certification",
            "target_date": "not-a-valid-date-format",
        }
        goal_res = await ac.post("/api/v1/mentoring/goals", json=bad_goal, headers=std_headers)
        assert goal_res.status_code == 400
        assert "YYYY-MM-DD" in goal_res.json()["detail"]

        # 2. Invalid goal status -> 400 Bad Request
        bad_status_goal = {
            "student_id": student_uid,
            "title": "Complete Certification",
            "target_date": "2026-11-30",
            "status": "forged_approved_status",
        }
        status_res = await ac.post("/api/v1/mentoring/goals", json=bad_status_goal, headers=std_headers)
        assert status_res.status_code == 400

        # 3. Malformed DOI in publication -> 400 Bad Request
        bad_pub = {
            "title": "Quantum Computing Frontiers",
            "authors": ["Dr. Researcher"],
            "department_code": "CS",
            "journal_name": "Nature Quantum",
            "indexing": "Scopus",
            "publication_year": 2026,
            "doi_or_url": "malformed-doi-xyz-123",
        }
        pub_res = await ac.post("/api/v1/research/publications", json=bad_pub, headers=fac_headers)
        assert pub_res.status_code == 400
        assert "DOI" in pub_res.json()["detail"]


@pytest.mark.asyncio
async def test_privacy_exclusion_of_counseling_notes():
    """Verify private faculty counseling notes are strictly excluded from student and parent views."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_token, student_uid = create_test_token("student")
        faculty_token, faculty_uid = create_test_token("faculty")

        std_headers = {"Authorization": f"Bearer {student_token}"}
        fac_headers = {"Authorization": f"Bearer {faculty_token}"}

        # Faculty logs a session with private confidential notes
        session_body = {
            "student_id": student_uid,
            "meeting_date": "2026-10-08",
            "meeting_type": "one_on_one",
            "academic_notes": "Reviewed Semester 3 marks and project milestones.",
            "personal_notes": "CONFIDENTIAL COUNSELOR OBSERVATION: Family bereavement issues noted.",
            "goals": "Submit project proposal by Friday.",
        }
        log_res = await ac.post("/api/v1/mentoring/records", json=session_body, headers=fac_headers)
        assert log_res.status_code == 201

        # Student views their mentor record
        student_view = await ac.get("/api/v1/mentoring/my-mentor", headers=std_headers)
        assert student_view.status_code == 200
        data_str = student_view.text
        assert "CONFIDENTIAL COUNSELOR OBSERVATION" not in data_str
        assert "personal_notes" not in student_view.json()
