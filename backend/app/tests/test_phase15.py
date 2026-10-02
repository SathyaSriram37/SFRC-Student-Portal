"""Phase 15 Test Suite — Pragya AI, DB Tools, Multi-turn Complaint Flow, RAG Ingestion & Retrieval, and Security."""
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from jose import jwt

from app.main import app
from app.core.config import settings


def create_test_token(role: str = "student", user_id: str = None, extra_claims: dict = None) -> str:
    sub = user_id or ("00000000-0000-0000-0000-000000000001" if role == "student" else "00000000-0000-0000-0000-000000000004")
    payload = {
        "sub": sub,
        "email": f"{role}@sfrc.edu.in",
        "role": "authenticated",
        "user_metadata": {
            "role": role,
            "full_name": "Karpagam S" if role == "student" else "System Administrator",
            "register_number": "22UCA042" if role == "student" else None,
        },
        "app_metadata": {
            "role": role,
        },
        "name": "Karpagam S" if role == "student" else "System Administrator",
        "register_number": "22UCA042" if role == "student" else None,
        "department_code": "CS",
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
    }
    if extra_claims:
        payload.update(extra_claims)
    secret = settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890"
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture
def student_auth_headers():
    token = create_test_token(role="student")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers():
    token = create_test_token(role="admin")
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_pragya_no_key_graceful_response(student_auth_headers):
    """Test 1: When no external LLM API key is present, Pragya executes DB tools gracefully without 500 error."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/pragya/chat",
            json={"message": "What is the general college guidance?"},
            headers=student_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        assert len(data["reply"]) > 0
        assert "conversation_id" in data


@pytest.mark.asyncio
async def test_pragya_attendance_tool(student_auth_headers):
    """Test 2: 'My attendance' invokes attendance DB tool and returns real percentage."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/pragya/chat",
            json={"message": "What is my attendance percentage?"},
            headers=student_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "88.5%" in data["reply"]
        assert data["intent"] == "attendance"
        assert any("Attendance" in s for s in data["sources"])


@pytest.mark.asyncio
async def test_pragya_library_irc_tool(student_auth_headers):
    """Test 3: 'library' intent returns official SFRC IRC static details."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/pragya/chat",
            json={"message": "Tell me about the library and timings"},
            headers=student_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "64,795 volumes" in data["reply"]
        assert "J-Gate, DELNET, INFLIBNET N-List" in data["reply"]
        assert data["intent"] == "library"


@pytest.mark.asyncio
async def test_pragya_complaint_three_turn_flow(student_auth_headers):
    """Test 4: Multi-turn complaint flow from intent detection -> details extraction -> ticket CC-XXXXX creation."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Turn 1: Trigger complaint intent
        t1_res = await ac.post(
            "/api/v1/pragya/chat",
            json={"message": "I want to report a broken projector"},
            headers=student_auth_headers,
        )
        assert t1_res.status_code == 200
        t1_data = t1_res.json()
        conv_id = t1_data["conversation_id"]
        assert "Describe briefly (what, where)?" in t1_data["reply"]

        # Turn 2: Provide details & location
        t2_res = await ac.post(
            "/api/v1/pragya/chat",
            json={
                "message": "Broken projector in Room 104 MCA Block",
                "conversation_id": conv_id,
            },
            headers=student_auth_headers,
        )
        assert t2_res.status_code == 200
        t2_data = t2_res.json()
        assert "Filing:" in t2_data["reply"]
        assert "Proceed? (yes/no)" in t2_data["reply"]

        # Turn 3: Confirm with yes
        t3_res = await ac.post(
            "/api/v1/pragya/chat",
            json={
                "message": "yes proceed",
                "conversation_id": conv_id,
            },
            headers=student_auth_headers,
        )
        assert t3_res.status_code == 200
        t3_data = t3_res.json()
        assert "created! Track in Campus Care" in t3_data["reply"]
        assert "CC-" in t3_data["reply"]


@pytest.mark.asyncio
async def test_admin_rag_sources_and_ingestion(admin_auth_headers, student_auth_headers):
    """Test 5: Admin RAG source creation, manual ingestion, and job history."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Student cannot access admin RAG endpoints -> 403
        std_res = await ac.get("/api/v1/admin/rag/sources", headers=student_auth_headers)
        assert std_res.status_code == 403

        # Admin lists sources
        list_res = await ac.get("/api/v1/admin/rag/sources", headers=admin_auth_headers)
        assert list_res.status_code == 200
        sources = list_res.json()
        assert len(sources) >= 3

        # Admin adds new knowledge source
        add_res = await ac.post(
            "/api/v1/admin/rag/sources",
            json={
                "title": "SFRC Anti-Ragging Guidelines 2026",
                "type": "manual",
                "category": "compliance",
                "department": "Student Welfare",
                "content": "Zero tolerance anti-ragging policy as per UGC statutory guidelines. 24x7 helpline active.",
            },
            headers=admin_auth_headers,
        )
        assert add_res.status_code == 201
        new_source = add_res.json()
        assert new_source["title"] == "SFRC Anti-Ragging Guidelines 2026"

        # Admin triggers re-ingestion
        ingest_res = await ac.post(
            f"/api/v1/admin/rag/ingest/{new_source['id']}",
            headers=admin_auth_headers,
        )
        assert ingest_res.status_code == 200
        assert ingest_res.json()["status"] == "Completed"

        # Admin checks job history
        jobs_res = await ac.get("/api/v1/admin/rag/jobs", headers=admin_auth_headers)
        assert jobs_res.status_code == 200
        jobs = jobs_res.json()
        assert len(jobs) >= 1


@pytest.mark.asyncio
async def test_student_data_isolation_security(student_auth_headers):
    """Test 6: Student attempting to query another student's specific register number is blocked with 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/pragya/chat",
            json={"message": "Show attendance and marks for student 22UCA099"},
            headers=student_auth_headers,
        )
        assert response.status_code == 403
        assert "Access Restricted" in response.json()["detail"]
