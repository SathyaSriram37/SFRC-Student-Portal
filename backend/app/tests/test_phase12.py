"""
Test Phase 12: Career, Research, Entrepreneurship & Student Life
Validates placement eligibility computation, application submission, clubs enrollment, YWED courses, ACIDE startups, and research grants.
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
            "full_name": "Kavitha Raman" if role == "student" else "Dr. SFRC Faculty",
        },
        "app_metadata": {
            "role": role,
        },
        "name": "Kavitha Raman" if role == "student" else "Dr. SFRC Faculty",
        "department_code": "CS",
        "cgpa": 8.6,
        "attendance_pct": 87.5,
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
    }
    if extra_claims:
        payload.update(extra_claims)
    secret = settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890"
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_placement_drives_and_student_eligibility():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Eligible student (CGPA 8.6, Attendance 87.5%)
        student_token = create_test_token("student", {"cgpa": 8.6, "attendance_pct": 87.5})
        headers = {"Authorization": f"Bearer {student_token}"}

        res = await ac.get("/api/v1/placement/drives", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "drives" in data
        assert len(data["drives"]) == 5

        # Check TCS drive (min_cgpa: 7.0) -> Eligible
        tcs = next((d for d in data["drives"] if "TCS" in d["company_name"]), None)
        assert tcs is not None
        assert tcs["eligibility"]["eligible"] is True
        assert any("CGPA" in r and "✓" in r for r in tcs["eligibility"]["reasons"])

        # 2. Ineligible student (CGPA 5.8, Attendance 65%)
        low_token = create_test_token("student", {"sub": "std-low-002", "cgpa": 5.8, "attendance_pct": 65.0})
        low_headers = {"Authorization": f"Bearer {low_token}"}

        res_low = await ac.get("/api/v1/placement/drives", headers=low_headers)
        assert res_low.status_code == 200
        low_data = res_low.json()
        lt_drive = next((d for d in low_data["drives"] if "L&T" in d["company_name"]), None)
        assert lt_drive is not None
        assert lt_drive["eligibility"]["eligible"] is False
        assert any("CGPA 5.8" in r and "✗" in r for r in lt_drive["eligibility"]["reasons"])


@pytest.mark.asyncio
async def test_placement_application_submission_and_eligibility_enforcement():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Ineligible student cannot apply
        ineligible_token = create_test_token("student", {"sub": "std-ineligible-99", "cgpa": 5.5, "attendance_pct": 60.0})
        headers_inelig = {"Authorization": f"Bearer {ineligible_token}"}

        res_fail = await ac.post("/api/v1/placement/drives/drive-lt-005/apply", headers=headers_inelig)
        assert res_fail.status_code == 403
        assert "Ineligible to apply" in res_fail.json()["detail"]

        # Eligible student applies to Infosys drive
        eligible_token = create_test_token("student", {"sub": "std-fresh-003", "cgpa": 8.9, "attendance_pct": 90.0})
        headers_elig = {"Authorization": f"Bearer {eligible_token}"}

        res_ok = await ac.post("/api/v1/placement/drives/drive-infy-002/apply", json={}, headers=headers_elig)
        assert res_ok.status_code == 200
        app_data = res_ok.json()
        assert app_data["drive_id"] == "drive-infy-002"
        assert app_data["status"] == "applied"

        # Duplicate application rejected
        res_dup = await ac.post("/api/v1/placement/drives/drive-infy-002/apply", json={}, headers=headers_elig)
        assert res_dup.status_code == 400

        # Check my applications
        res_my = await ac.get("/api/v1/placement/me/applications", headers=headers_elig)
        assert res_my.status_code == 200
        my_apps = res_my.json()
        assert len(my_apps) >= 1
        assert any(a["drive_id"] == "drive-infy-002" for a in my_apps)


@pytest.mark.asyncio
async def test_clubs_and_join_toggle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        token = create_test_token("student", {"sub": "std-test-club-01"})
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.get("/api/v1/clubs", headers=headers)
        assert res.status_code == 200
        clubs = res.json()
        assert len(clubs) >= 21  # 10 official clubs + 11 NSS/NCC units

        club_names = [c["name"] for c in clubs]
        assert "Student Union" in club_names
        assert "Literary Club" in club_names
        assert "Computer Club" in club_names
        assert "National Service Scheme (NSS)" in club_names
        assert "National Cadet Corps (NCC)" in club_names

        # Join Literary Club
        join_res = await ac.post("/api/v1/clubs/club-02/join", headers=headers)
        assert join_res.status_code == 200
        join_data = join_res.json()
        assert join_data["is_member"] is True

        # Check that Literary Club now reflects is_member = True
        check_res = await ac.get("/api/v1/clubs", headers=headers)
        lit = next(c for c in check_res.json() if c["id"] == "club-02")
        assert lit["is_member"] is True


@pytest.mark.asyncio
async def test_acide_startups_and_ywed_courses():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        token = create_test_token("student")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. ACIDE 7 Startups
        res_startups = await ac.get("/api/v1/student-life/acide-startups", headers=headers)
        assert res_startups.status_code == 200
        startups = res_startups.json()
        assert len(startups) == 7

        startup_names = {s["startup_name"] for s in startups}
        expected_startups = {"Kissan Innova", "Yos Deliza", "Kraftiga", "Thukhil", "Belle", "ChemEmpor", "Explora"}
        assert expected_startups == startup_names

        # 2. YWED Courses
        res_ywed = await ac.get("/api/v1/student-life/ywed-courses", headers=headers)
        assert res_ywed.status_code == 200
        ywed_data = res_ywed.json()
        courses = ywed_data["courses"]
        assert len(courses) >= 17  # 5 long-term + 12 short-term

        long_term = [c for c in courses if c["course_type"] == "long_term"]
        short_term = [c for c in courses if c["course_type"] == "short_term"]
        assert len(long_term) == 5
        assert len(short_term) >= 11

        assert any("Typewriting" in c["course_name"] for c in long_term)
        assert any("Tailoring" in c["course_name"] for c in long_term)
        assert any("Aari Work" in c["course_name"] for c in short_term)
        assert any("Lippan Art" in c["course_name"] for c in short_term)


@pytest.mark.asyncio
async def test_research_grants_and_publications():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        fac_token = create_test_token("faculty", {"sub": "fac-cs-meena", "name": "Dr. R. Meenakshi"})
        headers = {"Authorization": f"Bearer {fac_token}"}

        # 1. List research projects
        res_proj = await ac.get("/api/v1/research/projects", headers=headers)
        assert res_proj.status_code == 200
        assert len(res_proj.json()) >= 4

        # 2. Create research project as faculty
        new_proj_payload = {
            "title": "Quantum Cryptography for Secure Campus IoT Infrastructure",
            "principal_investigator": "Dr. R. Meenakshi",
            "department_code": "CS",
            "funding_agency": "DRDO",
            "project_type": "Major",
            "sanctioned_amount": 3500000.0,
            "start_date": "2026-06-01",
            "end_date": "2029-05-31",
            "status": "Ongoing",
            "description": "Post-quantum lattice based encryption primitives for academic intranets.",
        }
        res_create = await ac.post("/api/v1/research/projects", json=new_proj_payload, headers=headers)
        assert res_create.status_code == 201
        assert res_create.json()["title"] == new_proj_payload["title"]

        # 3. Summary
        res_sum = await ac.get("/api/v1/research/summary", headers=headers)
        assert res_sum.status_code == 200
        sum_data = res_sum.json()
        assert sum_data["total_projects"] >= 5
        assert sum_data["total_grants_sanctioned_inr"] > 5000000.0
