"""Phase 16 Test Suite — Notifications, Preferences, FCM Device Tokens, and Dispatch Service."""
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from jose import jwt

from app.main import app
from app.core.config import settings
from app.services.notification_service import NotificationService, SEED_NOTIFICATIONS


def create_test_token(role: str = "student", user_id: str = None) -> str:
    sub = user_id or "00000000-0000-0000-0000-000000000001"
    payload = {
        "sub": sub,
        "email": f"{role}@sfrc.edu.in",
        "role": "authenticated",
        "user_metadata": {
            "role": role,
            "full_name": "Karpagam S",
        },
        "app_metadata": {
            "role": role,
        },
        "name": "Karpagam S",
        "department_code": "CS",
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
    }
    secret = settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890"
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture
def student_auth_headers():
    token = create_test_token(role="student")
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_list_notifications_with_unread_count(student_auth_headers):
    """Test 1: GET /api/v1/notifications returns user's notifications and unread_count."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/notifications", headers=student_auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "notifications" in data
        assert "unread_count" in data
        assert "total" in data
        assert len(data["notifications"]) >= 1


@pytest.mark.asyncio
async def test_mark_single_notification_read(student_auth_headers):
    """Test 2: POST /api/v1/notifications/{id}/read updates read state to True."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        list_res = await ac.get("/api/v1/notifications", headers=student_auth_headers)
        notifs = list_res.json()["notifications"]
        assert len(notifs) > 0
        target_id = notifs[0]["id"]

        read_res = await ac.post(f"/api/v1/notifications/{target_id}/read", headers=student_auth_headers)
        assert read_res.status_code == 200
        assert read_res.json()["read"] is True


@pytest.mark.asyncio
async def test_mark_all_notifications_read(student_auth_headers):
    """Test 3: POST /api/v1/notifications/read-all marks all user notifications as read."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/notifications/read-all", headers=student_auth_headers)
        assert res.status_code == 200
        assert "message" in res.json()

        # Verify unread count becomes 0
        list_res = await ac.get("/api/v1/notifications?read=false", headers=student_auth_headers)
        assert list_res.status_code == 200
        assert list_res.json()["unread_count"] == 0


@pytest.mark.asyncio
async def test_notification_preferences_get_and_update(student_auth_headers):
    """Test 4: User can retrieve and update their notification channel preferences."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        get_res = await ac.get("/api/v1/notifications/preferences", headers=student_auth_headers)
        assert get_res.status_code == 200
        prefs = get_res.json()
        assert "email_enabled" in prefs
        assert "push_enabled" in prefs

        update_res = await ac.put(
            "/api/v1/notifications/preferences",
            json={
                "email_enabled": True,
                "sms_enabled": True,
                "push_enabled": True,
                "academic_alerts": True,
                "complaint_updates": True,
                "event_announcements": True,
                "library_reminders": False,
                "fee_alerts": True,
            },
            headers=student_auth_headers,
        )
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["sms_enabled"] is True
        assert updated["library_reminders"] is False


@pytest.mark.asyncio
async def test_register_fcm_device_token(student_auth_headers):
    """Test 5: Registering FCM push token saves device successfully."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/device-tokens",
            json={
                "token": "fcm-fake-test-device-token-1234567890",
                "device_type": "web",
            },
            headers=student_auth_headers,
        )
        assert res.status_code == 201
        assert res.json()["status"] == "registered"


@pytest.mark.asyncio
async def test_notification_service_send_and_fcm_safety():
    """Test 6: NotificationService dispatches alerts without crashing even if FCM is enabled/disabled."""
    service_fcm_on = NotificationService(db=None, fcm_enabled=True)
    notif = await service_fcm_on.send(
        user_id="00000000-0000-0000-0000-000000000001",
        title="Leave Request Approved",
        message="Your on-duty leave request for TechSpark 2026 has been approved by your HOD.",
        type="success",
        entity_type="leave",
        entity_id="lv-999",
        link="/student/leave",
    )
    assert notif["title"] == "Leave Request Approved"
    assert notif["type"] == "success"
    assert notif["read"] is False
