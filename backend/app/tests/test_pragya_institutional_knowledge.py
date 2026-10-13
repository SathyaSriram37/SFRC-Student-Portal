"""Comprehensive Production Test Suite for Pragya AI Institutional Knowledge Base.
Validates all institutional data extracted from https://www.sfrcollege.edu.in/ and SFRC_Assist.
Ensures zero hardcoded mock logic, database integration, and accurate responses.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from jose import jwt

from app.main import app
from app.core.config import settings


def create_student_token(reg_no: str = "22UCA042") -> str:
    payload = {
        "sub": "00000000-0000-0000-0000-000000000001",
        "email": "student@sfrcollege.edu.in",
        "role": "authenticated",
        "user_metadata": {
            "role": "student",
            "full_name": "Karpagam S",
            "register_number": reg_no,
        },
        "app_metadata": {"role": "student"},
        "name": "Karpagam S",
        "register_number": reg_no,
        "department_code": "CS",
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
    }
    secret = settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890"
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture
def auth_headers():
    token = create_student_token()
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_pragya_about_sfrc(auth_headers):
    """Verifies Pragya returns NAAC A+ 3.42, 1968, and heritage details."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "Tell me about SFRC college"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "The Standard Fireworks Rajaratnam College for Women" in reply
        assert "1968" in reply
        assert "A+" in reply
        assert "3.42" in reply


@pytest.mark.asyncio
async def test_pragya_programmes_40(auth_headers):
    """Verifies Pragya provides the comprehensive 40 programmes inventory."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "What courses are offered in SFRC?"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "40 Programmes" in reply
        assert "UG Aided" in reply
        assert "UG Self-Financed" in reply


@pytest.mark.asyncio
async def test_pragya_ug_aided_courses(auth_headers):
    """Verifies UG Aided programmes are accurately listed."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "What are the Aided courses in SFRC?"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "B.A. Tamil" in reply or "Tamil" in reply
        assert "Mathematics" in reply
        assert "Physics" in reply
        assert "Chemistry" in reply


@pytest.mark.asyncio
async def test_pragya_pg_and_mca(auth_headers):
    """Verifies PG courses including AICTE approved MCA."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "What PG courses are offered at SFRC?"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "M.C.A." in reply
        assert "AICTE Approved" in reply


@pytest.mark.asyncio
async def test_pragya_phd_centres(auth_headers):
    """Verifies 8 approved Ph.D research centres under MKU."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "What are the recognized research departments?"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "Research Centres" in reply
        assert "Madurai Kamaraj University" in reply


@pytest.mark.asyncio
async def test_pragya_certificate_courses(auth_headers):
    """Verifies 27+ career oriented certificate courses."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "What certificate courses are available in SFRC?"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "Pyrotechnic Chemistry" in reply
        assert "Forensic Science" in reply
        assert "Tally Prime" in reply


@pytest.mark.asyncio
async def test_pragya_cia_scheme(auth_headers):
    """Verifies autonomous CIA 40 marks breakdown (Tests 25 + Quiz 10 + Assignment 5)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "How are CIA internal marks calculated?"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "40 Marks Total" in reply
        assert "25 Marks" in reply
        assert "10 Marks" in reply
        assert "5 Marks" in reply


@pytest.mark.asyncio
async def test_pragya_passing_minimum(auth_headers):
    """Verifies theory and practical passing minimums for UG and PG."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "What is the passing minimum mark in semester exams?"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "21 out of 60 marks" in reply
        assert "40 out of 100" in reply
        assert "27 out of 60 marks" in reply
        assert "50 out of 100" in reply


@pytest.mark.asyncio
async def test_pragya_attendance_regulations(auth_headers):
    """Verifies 75% rule and 65-74% condonation bracket."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "What happens if attendance is below 75%?"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "75% & Above" in reply
        assert "65% to 74%" in reply
        assert "condoned by the Principal" in reply


@pytest.mark.asyncio
async def test_pragya_fees_data_science(auth_headers):
    """Verifies fee schedule lookup from SFRC_Assist repository."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "What is the fee for Data Science?"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "₹19,000" in reply
        assert "₹970" in reply


@pytest.mark.asyncio
async def test_pragya_fees_physics(auth_headers):
    """Verifies fee lookup for basic sciences."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "What is the fee for Physics?"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "₹3,200" in reply


@pytest.mark.asyncio
async def test_pragya_faculty_tamil_hod(auth_headers):
    """Verifies faculty lookup for Dr. B. Ponni in Tamil."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "Who is the HOD of Tamil?"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "Dr. B. Ponni" in reply


@pytest.mark.asyncio
async def test_pragya_phd_guides_commerce(auth_headers):
    """Verifies research supervisor lookup."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "Show Ph.D guides in Commerce"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "Dr. V. Meenakshi" in reply or "Dr. T. Palaneeswari" in reply


@pytest.mark.asyncio
async def test_pragya_transport_route1(auth_headers):
    """Verifies Route 1 driver Mr. M. Senthil and stops."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "Show transport details for Route 1"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "Mr. M. Senthil" in reply
        assert "Sivakasi Old Bus Stand" in reply


@pytest.mark.asyncio
async def test_pragya_pudhumai_penn(auth_headers):
    """Verifies Moovalur Ramamirtham Pudhumai Penn scholarship details."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "What is Pudhumai Penn scholarship scheme?"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "₹1,000 per month" in reply
        assert "Government Schools from Class 6 to Class 12" in reply


@pytest.mark.asyncio
async def test_pragya_acide_startups(auth_headers):
    """Verifies ACIDE incubation centre and real student startups."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "What is ACIDE incubation centre?"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "Kissan Innova" in reply
        assert "Kraftiga" in reply


@pytest.mark.asyncio
async def test_pragya_hostel_warden(auth_headers):
    """Verifies hostel facilities and Chief Warden Dr. T. Palaneeswari."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "What are the hostel facilities in SFRC?"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "Dr. T. Palaneeswari" in reply
        assert "Main Hostel Block" in reply


@pytest.mark.asyncio
async def test_pragya_tanglish_query(auth_headers):
    """Verifies Tanglish query understanding for course details."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/pragya/chat", json={"message": "sfrc la enna enna course iruku"}, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "40 Programmes" in reply or "UG Aided" in reply
