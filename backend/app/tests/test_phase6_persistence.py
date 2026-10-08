"""
Phase 6: Notifications & Cross-Portal Database Persistence Tests.

Validates that:
1. Notifications are stored in the database (`notifications` table) as the single source of truth.
2. User-specific notification listing strictly isolates user data.
3. Mark as read updates the database record persistently.
4. Mark all as read updates all unread notifications for that user.
5. Notification deletion removes the database record.
6. Notification preferences are read/written to the database and suppress matching notification categories.
7. FCM device tokens are persisted to `device_tokens` table.
8. Cross-portal flows (Hostel leave approvals, Mentoring session logging, Mentoring meeting requests)
   generate persistent notifications in the database for the recipient.
9. Direct database verification is performed for all write/read/delete operations.
"""
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
    sub_id = f"{role[:3]}-phase6-{uuid.uuid4().hex[:6]}"
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
async def test_notification_db_persistence_and_isolation():
    """Verify notifications are created in DB, fetched by recipient, and isolated across users."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_token, student_user_id = create_test_token("student")
        auth_headers_student = {"Authorization": f"Bearer {student_token}"}
        faculty_token, faculty_user_id = create_test_token("faculty")
        auth_headers_faculty = {"Authorization": f"Bearer {faculty_token}"}

        # 1. Send persistent notification to student using NotificationService
        notif_service = NotificationService()
        result = await notif_service.send(
            user_id=student_user_id,
            title="Database Persistent Alert",
            message="Your assignment submission deadline is tomorrow.",
            type="academic",
            entity_type="assignments",
            entity_id="asg-101",
        )
        notif_id = result["id"]

        # 2. Direct database verification
        async with AsyncSessionLocal() as db:
            q = text("SELECT id, user_id, title, message, type, read FROM notifications WHERE id = :id")
            row = (await db.execute(q, {"id": notif_id})).mappings().first()
            assert row is not None
            assert row["id"] == notif_id
            assert row["user_id"] == student_user_id
            assert row["title"] == "Database Persistent Alert"
            assert row["type"] == "academic"
            assert bool(row["read"]) is False

        # 3. Student fetches notifications via API
        resp = await ac.get("/api/v1/notifications", headers=auth_headers_student)
        assert resp.status_code == 200
        data = resp.json()
        assert "notifications" in data
        assert any(n["id"] == notif_id for n in data["notifications"])

        # 4. Faculty should NOT see the student's notification (Data Isolation)
        fac_resp = await ac.get("/api/v1/notifications", headers=auth_headers_faculty)
        assert fac_resp.status_code == 200
        fac_data = fac_resp.json()
        assert not any(n["id"] == notif_id for n in fac_data["notifications"])


@pytest.mark.asyncio
async def test_notification_mark_read_and_read_all():
    """Verify marking notifications as read persists directly to database and rejects unauthorized users."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_token, student_user_id = create_test_token("student")
        auth_headers_student = {"Authorization": f"Bearer {student_token}"}
        faculty_token, _ = create_test_token("faculty")
        auth_headers_faculty = {"Authorization": f"Bearer {faculty_token}"}

        notif_service = NotificationService()

        # Create two notifications for student
        n1 = await notif_service.send(user_id=student_user_id, title="Test Notif 1", message="Msg 1", type="info")
        n2 = await notif_service.send(user_id=student_user_id, title="Test Notif 2", message="Msg 2", type="info")

        id1, id2 = n1["id"], n2["id"]

        # 1. Faculty attempts to mark student's notification as read -> should fail (403 or 404)
        fail_resp = await ac.post(f"/api/v1/notifications/{id1}/read", headers=auth_headers_faculty)
        assert fail_resp.status_code in (403, 404)

        # 2. Student marks id1 as read
        resp = await ac.post(f"/api/v1/notifications/{id1}/read", headers=auth_headers_student)
        assert resp.status_code == 200
        assert resp.json()["read"] is True

        # Direct DB verification: id1 is read, id2 is unread
        async with AsyncSessionLocal() as db:
            row1 = (await db.execute(text("SELECT read FROM notifications WHERE id = :id"), {"id": id1})).mappings().first()
            row2 = (await db.execute(text("SELECT read FROM notifications WHERE id = :id"), {"id": id2})).mappings().first()
            assert bool(row1["read"]) is True
            assert bool(row2["read"]) is False

        # 3. Student marks all as read
        all_resp = await ac.post("/api/v1/notifications/read-all", headers=auth_headers_student)
        assert all_resp.status_code == 200

        # Direct DB verification: both are now read
        async with AsyncSessionLocal() as db:
            row2_updated = (await db.execute(text("SELECT read FROM notifications WHERE id = :id"), {"id": id2})).mappings().first()
            assert bool(row2_updated["read"]) is True


@pytest.mark.asyncio
async def test_notification_delete_persistence():
    """Verify deleting a notification removes it from the database and prevents unauthorized deletion."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_token, student_user_id = create_test_token("student")
        auth_headers_student = {"Authorization": f"Bearer {student_token}"}
        faculty_token, _ = create_test_token("faculty")
        auth_headers_faculty = {"Authorization": f"Bearer {faculty_token}"}

        notif_service = NotificationService()

        n = await notif_service.send(user_id=student_user_id, title="Delete Me", message="To be deleted", type="info")
        del_id = n["id"]

        # Faculty tries to delete student's notification -> 403 or 404
        unauth_resp = await ac.delete(f"/api/v1/notifications/{del_id}", headers=auth_headers_faculty)
        assert unauth_resp.status_code in (403, 404)

        # Student deletes their own notification
        del_resp = await ac.delete(f"/api/v1/notifications/{del_id}", headers=auth_headers_student)
        assert del_resp.status_code == 200

        # Direct DB verification: record is gone
        async with AsyncSessionLocal() as db:
            check = (await db.execute(text("SELECT * FROM notifications WHERE id = :id"), {"id": del_id})).mappings().first()
            assert check is None


@pytest.mark.asyncio
async def test_notification_preferences_and_suppression():
    """Verify persistent preferences update and suppression of disabled categories."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_token, student_user_id = create_test_token("student")
        auth_headers_student = {"Authorization": f"Bearer {student_token}"}

        # 1. Update preferences: disable event_announcements and fee_alerts
        pref_payload = {
            "email_enabled": True,
            "sms_enabled": False,
            "push_enabled": True,
            "academic_alerts": True,
            "complaint_updates": True,
            "event_announcements": False,
            "library_reminders": True,
            "fee_alerts": False,
        }
        put_resp = await ac.put("/api/v1/notifications/preferences", json=pref_payload, headers=auth_headers_student)
        assert put_resp.status_code == 200

        # Direct DB check on user_profiles
        async with AsyncSessionLocal() as db:
            p_row = (await db.execute(text("SELECT preferences FROM user_profiles WHERE id = :uid"), {"uid": student_user_id})).mappings().first()
            assert p_row is not None

        # 2. Dispatch suppressed notification (event)
        notif_service = NotificationService()
        sup_result = await notif_service.send(
            user_id=student_user_id,
            title="Campus Hackathon 2026",
            message="Register for the national hackathon.",
            type="event",
        )
        assert sup_result.get("suppressed") is True

        # Verify suppressed notification was NOT inserted in DB
        async with AsyncSessionLocal() as db:
            s_row = (await db.execute(text("SELECT * FROM notifications WHERE id = :id"), {"id": sup_result["id"]})).mappings().first()
            assert s_row is None

        # 3. Dispatch allowed notification (academic)
        allowed_result = await notif_service.send(
            user_id=student_user_id,
            title="CIA Exam Timetable",
            message="Internal exams timetable released.",
            type="academic",
        )
        assert allowed_result.get("suppressed") is not True

        # Verify allowed notification WAS inserted in DB
        async with AsyncSessionLocal() as db:
            a_row = (await db.execute(text("SELECT * FROM notifications WHERE id = :id"), {"id": allowed_result["id"]})).mappings().first()
            assert a_row is not None
            assert a_row["title"] == "CIA Exam Timetable"


@pytest.mark.asyncio
async def test_device_token_persistence():
    """Verify FCM device tokens are persisted to device_tokens database table."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_token, student_user_id = create_test_token("student")
        auth_headers_student = {"Authorization": f"Bearer {student_token}"}

        token_payload = {
            "token": f"fcm-token-{uuid.uuid4().hex[:8]}",
            "device_type": "android",
        }
        resp = await ac.post("/api/v1/device-tokens", json=token_payload, headers=auth_headers_student)
        assert resp.status_code == 201

        # Direct DB check in device_tokens table
        async with AsyncSessionLocal() as db:
            row = (await db.execute(
                text("SELECT user_id, token, device_type FROM device_tokens WHERE token = :tok"),
                {"tok": token_payload["token"]}
            )).mappings().first()
            assert row is not None
            assert row["user_id"] == student_user_id
            assert row["device_type"] == "android"


@pytest.mark.asyncio
async def test_cross_portal_hostel_leave_notification():
    """Verify Admin/Warden hostel leave approval creates a persistent notification for the student."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_token, student_user_id = create_test_token("student")
        auth_headers_student = {"Authorization": f"Bearer {student_token}"}
        admin_token, _ = create_test_token("admin", {"role": "admin"})
        auth_headers_admin = {"Authorization": f"Bearer {admin_token}"}

        # Apply for leave as student
        leave_body = {
            "from_date": "2026-10-15",
            "to_date": "2026-10-18",
            "reason": "Family function",
            "destination": "Madurai",
            "emergency_contact": "+91 98765 43210",
            "mode_of_travel": "Bus",
        }
        apply_resp = await ac.post("/api/v1/hostel/leave", json=leave_body, headers=auth_headers_student)
        assert apply_resp.status_code in (200, 201)
        leave_id = apply_resp.json()["id"]

        # Warden approves leave
        appr_resp = await ac.post(
            f"/api/v1/hostel/admin/leave/{leave_id}/approve",
            json={"remarks": "Approved by Warden Dr. Revathi"},
            headers=auth_headers_admin,
        )
        assert appr_resp.status_code == 200
        assert appr_resp.json()["status"] == "approved"

        # Direct DB check that a notification was created for student_user_id
        async with AsyncSessionLocal() as db:
            notif = (await db.execute(
                text("SELECT * FROM notifications WHERE user_id = :uid AND entity_id = :eid ORDER BY created_at DESC"),
                {"uid": student_user_id, "eid": leave_id}
            )).mappings().first()
            assert notif is not None
            assert "Approved" in notif["title"]
            assert leave_id in notif["message"]


@pytest.mark.asyncio
async def test_cross_portal_mentoring_notifications():
    """Verify Faculty logging mentoring session notifies mentee, and mentee requesting meeting notifies faculty."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        student_token, student_user_id = create_test_token("student")
        auth_headers_student = {"Authorization": f"Bearer {student_token}"}
        faculty_token, faculty_user_id = create_test_token("faculty")
        auth_headers_faculty = {"Authorization": f"Bearer {faculty_token}"}

        # Ensure mentorship assignment and faculty record exist in DB
        async with AsyncSessionLocal() as db:
            fac_row = (await db.execute(text("SELECT id FROM faculty WHERE user_id = :uid"), {"uid": faculty_user_id})).mappings().first()
            fac_id = str(fac_row["id"]) if fac_row else f"fac-{uuid.uuid4().hex[:6]}"
            if not fac_row:
                await db.execute(text("""
                    INSERT OR IGNORE INTO faculty (id, user_id, employee_id, department_id, designation, is_active)
                    VALUES (:fid, :fuid, :empid, 'dept-cs', 'Assistant Professor', 1)
                """), {"fid": fac_id, "fuid": faculty_user_id, "empid": f"EMP-{uuid.uuid4().hex[:6]}"})
            
            await db.execute(text("""
                INSERT INTO mentorship_assignments (id, student_id, faculty_id, is_active)
                VALUES (:mid, :sid, :fid, 1)
            """), {"mid": f"ma-{uuid.uuid4().hex[:8]}", "sid": student_user_id, "fid": fac_id})
            await db.commit()

        # 1. Faculty logs a session -> Student receives notification
        session_body = {
            "student_id": student_user_id,
            "meeting_date": "2026-10-08",
            "meeting_type": "one_on_one",
            "academic_notes": "Reviewed semester 3 progress.",
            "personal_notes": "Private note.",
            "goals": "Improve attendance to 95%",
        }
        log_resp = await ac.post("/api/v1/mentoring/records", json=session_body, headers=auth_headers_faculty)
        assert log_resp.status_code == 201
        rec_id = log_resp.json()["record_id"]

        # Verify persistent notification in DB for student
        async with AsyncSessionLocal() as db:
            notif = (await db.execute(
                text("SELECT * FROM notifications WHERE user_id = :uid AND entity_id = :eid"),
                {"uid": student_user_id, "eid": rec_id}
            )).mappings().first()
            assert notif is not None
            assert notif["title"] == "New Mentoring Session Logged"

        # 2. Student requests meeting -> Faculty receives notification
        req_resp = await ac.post(
            "/api/v1/mentoring/request-meeting",
            json={"preferred_date": "2026-10-12", "agenda": "Discussion on major project topic"},
            headers=auth_headers_student,
        )
        assert req_resp.status_code == 200

        # Verify persistent notification in DB for faculty
        async with AsyncSessionLocal() as db:
            f_notif = (await db.execute(
                text("SELECT * FROM notifications WHERE user_id = :fid AND entity_type = 'mentorship_assignments' ORDER BY created_at DESC"),
                {"fid": faculty_user_id}
            )).mappings().first()
            assert f_notif is not None
            assert "Mentoring Meeting Requested" in f_notif["title"]
