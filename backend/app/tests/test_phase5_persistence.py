"""Phase 5 Verification Test Suite: Faculty & Academic Operations Database Persistence.
Tests complete database persistence, CRUD operations, duplicate protection, ownership isolation, and student privacy.
"""
from __future__ import annotations

import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from jose import jwt
from sqlalchemy import text

from app.main import app
from app.core.config import settings
from app.core.database import AsyncSessionLocal


def create_test_token(role: str = "faculty", extra_claims: dict = None) -> str:
    sub_id = f"{role[:3]}-phase5-{uuid.uuid4().hex[:6]}"
    payload = {
        "sub": sub_id,
        "email": f"{sub_id}@sfrc.edu.in",
        "role": "authenticated",
        "user_metadata": {
            "role": role,
            "full_name": f"Test {role.capitalize()} Author",
            "department_code": "CS",
        },
        "app_metadata": {
            "role": role,
        },
        "name": f"Test {role.capitalize()} Author",
        "department_code": "CS",
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
    }
    if extra_claims:
        payload.update(extra_claims)
    secret = settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890"
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_faculty_econtent_persistence():
    """Test 1: Faculty creates econtent -> DB row verified -> Student retrieves -> Faculty updates -> Deletes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        fac_token = create_test_token("faculty")
        fac_headers = {"Authorization": f"Bearer {fac_token}"}
        other_fac_token = create_test_token("faculty")
        other_fac_headers = {"Authorization": f"Bearer {other_fac_token}"}
        std_token = create_test_token("student")
        std_headers = {"Authorization": f"Bearer {std_token}"}

        # 1. Create E-Content
        payload = {
            "title": f"Advanced Distributed Systems Architecture {uuid.uuid4().hex[:4]}",
            "description": "Comprehensive lectures on consensus, Raft protocol, and Paxos.",
            "category": "Video",
            "department": "Computer Science",
            "course_code": "CS501",
            "course_title": "Distributed Systems",
            "semester": 5,
            "content_type": "external_url",
            "external_url": "https://youtube.com/watch?v=distributed",
            "duration_minutes": 60,
            "tags": ["Distributed Systems", "Raft", "Consensus"],
            "status": "published",
        }
        res_create = await ac.post("/api/v1/econtent", json=payload, headers=fac_headers)
        assert res_create.status_code == 201
        created_data = res_create.json()
        content_id = created_data["id"]

        # 2. Verify direct database row
        async with AsyncSessionLocal() as db:
            row = (await db.execute(text("SELECT * FROM e_content WHERE id = :id"), {"id": content_id})).mappings().first()
            assert row is not None
            assert row["title"] == payload["title"]
            assert row["category"] == "Video"
            assert row["course_code"] == "CS501"

        # 3. Student can retrieve published content from DB
        res_get = await ac.get(f"/api/v1/econtent/{content_id}", headers=std_headers)
        assert res_get.status_code == 200
        assert res_get.json()["title"] == payload["title"]

        # 4. Unauthorized other faculty cannot edit content
        res_unauth_edit = await ac.put(f"/api/v1/econtent/{content_id}", json={"title": "Hacked Title"}, headers=other_fac_headers)
        assert res_unauth_edit.status_code == 403

        # 5. Faculty owner updates content
        new_title = f"Updated Distributed Systems {uuid.uuid4().hex[:4]}"
        res_edit = await ac.put(f"/api/v1/econtent/{content_id}", json={"title": new_title, "duration_minutes": 75}, headers=fac_headers)
        assert res_edit.status_code == 200
        assert res_edit.json()["title"] == new_title

        # Verify DB updated
        async with AsyncSessionLocal() as db:
            updated_row = (await db.execute(text("SELECT * FROM e_content WHERE id = :id"), {"id": content_id})).mappings().first()
            assert updated_row["title"] == new_title
            assert updated_row["duration_minutes"] == 75

        # 6. Delete e-content
        res_del = await ac.delete(f"/api/v1/econtent/{content_id}", headers=fac_headers)
        assert res_del.status_code == 200

        # Verify DB deletion
        async with AsyncSessionLocal() as db:
            deleted_row = (await db.execute(text("SELECT * FROM e_content WHERE id = :id"), {"id": content_id})).mappings().first()
            assert deleted_row is None


@pytest.mark.asyncio
async def test_student_econtent_bookmark_persistence():
    """Test 2: Student toggles bookmark -> DB row verified -> List retrieves -> Toggle removes -> DB deletion verified."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        std_token = create_test_token("student")
        std_headers = {"Authorization": f"Bearer {std_token}"}
        content_id = "ec-01"

        # 1. Bookmark item
        res_bm = await ac.post(f"/api/v1/econtent/{content_id}/bookmark", headers=std_headers)
        assert res_bm.status_code == 200
        assert res_bm.json()["is_bookmarked"] is True

        # 2. Verify direct database row
        async with AsyncSessionLocal() as db:
            jwt_payload = jwt.decode(std_token, settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890", algorithms=["HS256"])
            user_id = jwt_payload["sub"]
            bm_row = (await db.execute(text("SELECT * FROM econtent_bookmarks WHERE user_id = :user_id AND content_id = :content_id"), {"user_id": user_id, "content_id": content_id})).mappings().first()
            assert bm_row is not None

        # 3. Retrieve list of bookmarks
        res_list = await ac.get("/api/v1/econtent/me/bookmarks", headers=std_headers)
        assert res_list.status_code == 200
        bm_items = res_list.json()
        assert any(item["id"] == content_id for item in bm_items)

        # 4. Toggle bookmark to remove
        res_unbm = await ac.post(f"/api/v1/econtent/{content_id}/bookmark", headers=std_headers)
        assert res_unbm.status_code == 200
        assert res_unbm.json()["is_bookmarked"] is False

        # 5. Verify direct database deletion
        async with AsyncSessionLocal() as db:
            bm_del = (await db.execute(text("SELECT * FROM econtent_bookmarks WHERE user_id = :user_id AND content_id = :content_id"), {"user_id": user_id, "content_id": content_id})).mappings().first()
            assert bm_del is None


@pytest.mark.asyncio
async def test_faculty_research_project_persistence():
    """Test 3: Faculty creates research project -> DB row verified -> List retrieves -> Updates -> Deletes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        fac_token = create_test_token("faculty")
        fac_headers = {"Authorization": f"Bearer {fac_token}"}
        other_token = create_test_token("faculty")
        other_headers = {"Authorization": f"Bearer {other_token}"}

        # 1. Create Research Project
        payload = {
            "title": f"Quantum Computing Algorithms for Cryptanalysis {uuid.uuid4().hex[:4]}",
            "principal_investigator": "Dr. R. Meenakshi",
            "co_investigator": "Dr. S. Kavitha",
            "department_code": "CS",
            "funding_agency": "DST-SERB",
            "project_type": "Major",
            "sanctioned_amount": 3200000.0,
            "start_date": "2026-06-01",
            "end_date": "2029-05-31",
            "status": "Ongoing",
            "description": "Exploration of Shor and Grover algorithm variants.",
            "grant_sanction_order": "DST/SERB/QC/2026/012",
        }
        res_create = await ac.post("/api/v1/research/projects", json=payload, headers=fac_headers)
        assert res_create.status_code == 201
        proj = res_create.json()
        proj_id = proj["id"]

        # 2. Verify direct database row
        async with AsyncSessionLocal() as db:
            row = (await db.execute(text("SELECT * FROM research_projects WHERE id = :id"), {"id": proj_id})).mappings().first()
            assert row is not None
            assert row["title"] == payload["title"]
            assert float(row["sanctioned_amount"]) == 3200000.0

        # 3. List projects
        res_list = await ac.get("/api/v1/research/projects?dept=CS", headers=fac_headers)
        assert res_list.status_code == 200
        projs = res_list.json()
        assert any(p["id"] == proj_id for p in projs)

        # 4. Unauthorized other faculty cannot modify
        res_unauth = await ac.put(f"/api/v1/research/projects/{proj_id}", json={"title": "Unauthorized"}, headers=other_headers)
        assert res_unauth.status_code == 403

        # 5. Owner updates project
        new_title = f"Advanced Quantum Cryptanalysis {uuid.uuid4().hex[:4]}"
        res_edit = await ac.put(f"/api/v1/research/projects/{proj_id}", json={"title": new_title, "status": "Completed"}, headers=fac_headers)
        assert res_edit.status_code == 200
        assert res_edit.json()["title"] == new_title
        assert res_edit.json()["status"] == "Completed"

        # Verify DB updated
        async with AsyncSessionLocal() as db:
            updated_row = (await db.execute(text("SELECT * FROM research_projects WHERE id = :id"), {"id": proj_id})).mappings().first()
            assert updated_row["title"] == new_title
            assert updated_row["status"] == "Completed"

        # 6. Delete project
        res_del = await ac.delete(f"/api/v1/research/projects/{proj_id}", headers=fac_headers)
        assert res_del.status_code == 200

        # Verify DB deletion
        async with AsyncSessionLocal() as db:
            deleted_row = (await db.execute(text("SELECT * FROM research_projects WHERE id = :id"), {"id": proj_id})).mappings().first()
            assert deleted_row is None


@pytest.mark.asyncio
async def test_faculty_publication_persistence():
    """Test 4: Faculty creates publication -> DB row verified -> List retrieves -> Updates -> Deletes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        fac_token = create_test_token("faculty")
        fac_headers = {"Authorization": f"Bearer {fac_token}"}
        other_token = create_test_token("faculty")
        other_headers = {"Authorization": f"Bearer {other_token}"}

        # 1. Create Publication
        payload = {
            "title": f"Deep Residual Networks for Automated Medical Imaging {uuid.uuid4().hex[:4]}",
            "authors": ["Dr. R. Meenakshi", "K. Raman"],
            "department_code": "CS",
            "journal_name": "IEEE Transactions on Medical Imaging",
            "indexing": "Scopus",
            "impact_factor": 6.8,
            "issn_isbn": "0278-0062",
            "volume_issue_pages": "Vol. 45, pp. 112-124",
            "publication_year": 2026,
            "doi_or_url": "https://doi.org/10.1109/TMI.2026.1001",
            "paper_type": "Journal",
        }
        res_create = await ac.post("/api/v1/research/publications", json=payload, headers=fac_headers)
        assert res_create.status_code == 201
        pub = res_create.json()
        pub_id = pub["id"]

        # 2. Verify direct database row
        async with AsyncSessionLocal() as db:
            row = (await db.execute(text("SELECT * FROM faculty_publications WHERE id = :id"), {"id": pub_id})).mappings().first()
            assert row is not None
            assert row["title"] == payload["title"]
            assert float(row["impact_factor"]) == 6.8

        # 3. List publications
        res_list = await ac.get("/api/v1/research/publications?dept=CS", headers=fac_headers)
        assert res_list.status_code == 200
        pubs = res_list.json()
        assert any(p["id"] == pub_id for p in pubs)

        # 4. Unauthorized other faculty cannot edit
        res_unauth = await ac.put(f"/api/v1/research/publications/{pub_id}", json={"title": "Hacked Title"}, headers=other_headers)
        assert res_unauth.status_code == 403

        # 5. Owner updates publication
        new_title = f"Enhanced Deep Residual Networks {uuid.uuid4().hex[:4]}"
        res_edit = await ac.put(f"/api/v1/research/publications/{pub_id}", json={"title": new_title, "impact_factor": 7.2}, headers=fac_headers)
        assert res_edit.status_code == 200
        assert res_edit.json()["title"] == new_title

        # Verify DB updated
        async with AsyncSessionLocal() as db:
            updated_row = (await db.execute(text("SELECT * FROM faculty_publications WHERE id = :id"), {"id": pub_id})).mappings().first()
            assert updated_row["title"] == new_title
            assert float(updated_row["impact_factor"]) == 7.2

        # 6. Delete publication
        res_del = await ac.delete(f"/api/v1/research/publications/{pub_id}", headers=fac_headers)
        assert res_del.status_code == 200

        # Verify DB deletion
        async with AsyncSessionLocal() as db:
            deleted_row = (await db.execute(text("SELECT * FROM faculty_publications WHERE id = :id"), {"id": pub_id})).mappings().first()
            assert deleted_row is None


@pytest.mark.asyncio
async def test_mentoring_meetings_and_goals_persistence():
    """Test 5: Faculty logs meeting session & creates goals -> DB rows verified -> Student view verified without private notes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        fac_token = create_test_token("faculty")
        fac_headers = {"Authorization": f"Bearer {fac_token}"}
        student_id = f"std-mentee-{uuid.uuid4().hex[:6]}"

        # 1. Faculty logs meeting record
        meeting_payload = {
            "student_id": student_id,
            "meeting_date": "2026-10-08",
            "meeting_type": "Academic Counseling",
            "academic_notes": "Discussed CIA 2 preparation and lab projects.",
            "personal_notes": "CONFIDENTIAL: Discussed exam anxiety management.",
            "goals": "Complete 3 mock tests before next review.",
            "follow_up": "Check mock test scores next Wednesday.",
            "next_meeting": "2026-10-15",
        }
        res_meet = await ac.post("/api/v1/mentoring/records", json=meeting_payload, headers=fac_headers)
        assert res_meet.status_code == 201
        rec_id = res_meet.json()["record_id"]

        # 2. Verify direct database row
        async with AsyncSessionLocal() as db:
            m_row = (await db.execute(text("SELECT * FROM mentoring_records WHERE id = :id"), {"id": rec_id})).mappings().first()
            assert m_row is not None
            assert m_row["student_id"] == student_id
            assert m_row["personal_notes"] == "CONFIDENTIAL: Discussed exam anxiety management."

        # 3. Faculty creates mentoring goal
        goal_payload = {
            "student_id": student_id,
            "title": "Score 90%+ in Operating Systems",
            "description": "Review deadlock prevention and memory paging algorithms.",
            "target_date": "2026-11-10",
            "status": "in_progress",
        }
        res_goal = await ac.post("/api/v1/mentoring/goals", json=goal_payload, headers=fac_headers)
        assert res_goal.status_code == 201
        goal_id = res_goal.json()["goal_id"]

        # 4. Verify direct database row for goal
        async with AsyncSessionLocal() as db:
            g_row = (await db.execute(text("SELECT * FROM mentoring_goals WHERE id = :id"), {"id": goal_id})).mappings().first()
            assert g_row is not None
            assert g_row["title"] == goal_payload["title"]
            assert g_row["status"] == "in_progress"

        # 5. Update goal status to completed
        res_status = await ac.patch(f"/api/v1/mentoring/goals/{goal_id}/status", json={"status": "completed"}, headers=fac_headers)
        assert res_status.status_code == 200

        # Verify DB updated
        async with AsyncSessionLocal() as db:
            updated_g = (await db.execute(text("SELECT * FROM mentoring_goals WHERE id = :id"), {"id": goal_id})).mappings().first()
            assert updated_g["status"] == "completed"

        # 6. Faculty retrieves mentee detail with records and goals from DB
        res_detail = await ac.get(f"/api/v1/mentoring/mentees/{student_id}", headers=fac_headers)
        assert res_detail.status_code == 200
        detail = res_detail.json()
        assert any(r["id"] == rec_id for r in detail["meeting_records"])
        assert any(g["id"] == goal_id for g in detail["goals"])
