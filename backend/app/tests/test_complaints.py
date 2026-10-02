"""Tests for Phase 9 Campus Care / CivicFix AI Classification, SLA & Workflows."""
import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from jose import jwt
from unittest.mock import AsyncMock, MagicMock

from app.main import app
from app.core.config import settings
from app.core.database import get_db
from app.services.complaint_classifier import classify_complaint, calculate_sla_status


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


def test_ai_classification_rule_engine():
    """Unit test rule-based AI classifier."""
    res1 = classify_complaint("Projector screen flickering in Lab 2", "HDMI cable loose")
    assert res1["ai_category"] == "Computer/Projector"
    assert res1["suggested_priority"] == "high"

    res2 = classify_complaint("Water leak in ground floor washroom", "Tap broken")
    assert res2["ai_category"] == "Water/Plumbing"
    assert res2["suggested_priority"] == "medium"

    res3 = classify_complaint("Smoke and sparks from switchboard", "Emergency")
    assert res3["ai_category"] == "Emergency/Safety"
    assert res3["suggested_priority"] == "critical"


def test_sla_status_computation_overdue():
    """SUCCESS CRITERIA 3: SLA calculation marks red/overdue when elapsed > SLA limit."""
    now = datetime.now(timezone.utc)
    created_3h_ago = now - timedelta(hours=3.0)

    # High priority SLA is 2.0 hours -> 3h elapsed should be OVERDUE
    sla_res = calculate_sla_status(created_3h_ago, "high")
    assert sla_res["status"] == "overdue"
    assert sla_res["is_breached"] is True
    assert sla_res["elapsed_hours"] >= 2.9


@pytest.mark.asyncio
async def test_create_complaint_with_ai_classification_and_duplicate_check(monkeypatch):
    """SUCCESS CRITERIA 1 & 2: Submit complaint -> CC-00001 + AI category + duplicate check."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    student_token = create_token("s-10", "student@sfrc.ac.in", "student")

    mock_db = AsyncMock()

    def execute_side_effect(statement, params=None):
        sql = str(statement)
        m = MagicMock()
        if "FROM public.complaints c" in sql and "INTERVAL '30 days'" in sql:
            # Duplicate check found an existing similar open complaint
            m.mappings.return_value.all.return_value = [
                {
                    "id": "00000000-0000-0000-0000-000000000003",
                    "complaint_number": "CC-00003",
                    "title": "Smart Classroom 101 Projector not working",
                    "category": "Computer/Projector",
                    "location": "Science Block 1st Floor",
                    "status": "open",
                    "created_at": "2026-09-28 10:00:00",
                }
            ]
        elif "SELECT COUNT(*) FROM public.complaints" in sql:
            m.scalar.return_value = 0
        else:
            m.mappings.return_value.all.return_value = []
            m.mappings.return_value.first.return_value = None
            m.scalar.return_value = None
        return m

    mock_db.execute.side_effect = execute_side_effect

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post(
                "/api/v1/complaints",
                headers={"Authorization": f"Bearer {student_token}"},
                json={
                    "title": "Smart Classroom 101 Projector HDMI display broken",
                    "description": "Cannot connect laptop to display in room 101",
                    "location": "Science Block 1st Floor",
                },
            )
            assert res.status_code == 201
            data = res.json()
            assert data["complaint_number"] == "CC-00001"
            assert data["ai_result"]["ai_category"] == "Computer/Projector"
            assert data["ai_result"]["suggested_priority"] == "high"
            # Verify duplicate match
            assert len(data["possible_duplicates"]) == 1
            assert data["possible_duplicates"][0]["complaint_number"] == "CC-00003"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_admin_assign_and_resolve_flow(monkeypatch):
    """SUCCESS CRITERIA 4 & 5: Admin assigns -> resolves -> student submits feedback."""
    secret = "test-secret-12345"
    monkeypatch.setattr(settings, "supabase_jwt_secret", secret)
    admin_token = create_token("a-1", "admin@sfrc.ac.in", "admin")
    student_token = create_token("s-10", "student@sfrc.ac.in", "student")

    mock_db = AsyncMock()
    mock_db.execute.return_value = MagicMock()

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Admin Assigns ticket
            assign_res = await client.post(
                "/api/v1/complaints/00000000-0000-0000-0000-000000000001/assign",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "assigned_to": "00000000-0000-0000-0000-000000000088",
                    "assigned_department": "IT Support",
                    "notes": "Assigning technician to replace HDMI cable",
                },
            )
            assert assign_res.status_code == 200
            assert "assigned successfully" in assign_res.json()["message"]

            # 2. Technician Resolves ticket
            resolve_res = await client.post(
                "/api/v1/complaints/00000000-0000-0000-0000-000000000001/resolve",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"resolution_notes": "Replaced faulty HDMI cable with new gold-plated cable. Display tested OK."},
            )
            assert resolve_res.status_code == 200
            assert "marked as resolved" in resolve_res.json()["message"]

            # 3. Student Submits Feedback
            fb_res = await client.post(
                "/api/v1/complaints/00000000-0000-0000-0000-000000000001/feedback",
                headers={"Authorization": f"Bearer {student_token}"},
                json={"rating": 5, "comments": "Prompt resolution within 1 hour! Thank you."},
            )
            assert fb_res.status_code == 200
            assert "closed" in fb_res.json()["message"]
    finally:
        app.dependency_overrides.pop(get_db, None)
