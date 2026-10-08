"""Test suite for Phase 11 — E-Content / LMS Module."""
import pytest
from httpx import AsyncClient, ASGITransport
from jose import jwt
from app.main import app
from app.core.config import settings


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
    return jwt.encode(payload, settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890", algorithm="HS256")


import uuid

@pytest.fixture
def student_token():
    return create_token(f"usr-student-{uuid.uuid4().hex[:6]}", "student@sfrc.edu.in", "student")


@pytest.fixture
def faculty_token():
    return create_token("fac-01", "faculty@sfrc.edu.in", "faculty")


@pytest.mark.asyncio
async def test_student_econtent_catalog_and_seed_items(student_token: str):
    """Verify 8 seed items are visible and filtered by status='published'."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/econtent", headers={"Authorization": f"Bearer {student_token}"})
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert len(data["items"]) >= 8
        # Ensure all returned items are published
        assert all(item["status"] == "published" for item in data["items"])


@pytest.mark.asyncio
async def test_bookmark_and_progress_tracking(student_token: str):
    """Verify bookmark toggle, progress recording (30s+), and in-progress endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        content_id = "ec-01"

        # 1. Toggle Bookmark ON
        bm_res = await ac.post(f"/api/v1/econtent/{content_id}/bookmark", headers={"Authorization": f"Bearer {student_token}"})
        assert bm_res.status_code == 200
        assert bm_res.json()["is_bookmarked"] is True

        # 2. Check bookmarks list
        my_bm = await ac.get("/api/v1/econtent/me/bookmarks", headers={"Authorization": f"Bearer {student_token}"})
        assert my_bm.status_code == 200
        assert any(item["id"] == content_id for item in my_bm.json())

        # 3. Record View / Progress at 45%
        view_res = await ac.post(
            f"/api/v1/econtent/{content_id}/view",
            json={"progress_percentage": 45},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert view_res.status_code == 200
        assert view_res.json()["progress_percentage"] == 45

        # 4. In-progress list check
        in_prog = await ac.get("/api/v1/econtent/me/in-progress", headers={"Authorization": f"Bearer {student_token}"})
        assert in_prog.status_code == 200
        assert any(item["id"] == content_id for item in in_prog.json())


@pytest.mark.asyncio
async def test_faculty_create_and_draft_isolation(faculty_token: str, student_token: str):
    """Verify faculty create draft, draft hidden from student, and publish makes it visible."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        new_payload = {
            "title": "Quantum Computing Essentials Draft",
            "description": "Introductory qubit gates and superposition circuits.",
            "category": "Document",
            "department": "Computer Science",
            "course_code": "CS401",
            "course_title": "Quantum Informatics",
            "semester": 6,
            "content_type": "file",
            "file_url": "https://example.com/quantum.pdf",
            "status": "draft",
            "tags": ["Quantum", "Draft"],
        }

        # 1. Faculty creates draft
        create_res = await ac.post("/api/v1/econtent", json=new_payload, headers={"Authorization": f"Bearer {faculty_token}"})
        assert create_res.status_code == 201
        new_content_id = create_res.json()["id"]

        # 2. Student requests catalog — draft must NOT be in list
        student_catalog = await ac.get("/api/v1/econtent", headers={"Authorization": f"Bearer {student_token}"})
        assert not any(item["id"] == new_content_id for item in student_catalog.json()["items"])

        # 3. Student requests direct draft detail — must return 403
        direct_res = await ac.get(f"/api/v1/econtent/{new_content_id}", headers={"Authorization": f"Bearer {student_token}"})
        assert direct_res.status_code == 403

        # 4. Faculty toggles publish
        pub_res = await ac.post(f"/api/v1/econtent/{new_content_id}/publish", headers={"Authorization": f"Bearer {faculty_token}"})
        assert pub_res.status_code == 200
        assert pub_res.json()["new_status"] == "published"

        # 5. Now student can view it
        student_after_pub = await ac.get(f"/api/v1/econtent/{new_content_id}", headers={"Authorization": f"Bearer {student_token}"})
        assert student_after_pub.status_code == 200
        assert student_after_pub.json()["title"] == "Quantum Computing Essentials Draft"


@pytest.mark.asyncio
async def test_content_stats_and_analytics(faculty_token: str):
    """Verify view stats calculation for faculty/admin."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        stats_res = await ac.get("/api/v1/econtent/ec-01/stats", headers={"Authorization": f"Bearer {faculty_token}"})
        assert stats_res.status_code == 200
        data = stats_res.json()
        assert data["total_views"] >= 800
        assert "daily_views" in data
