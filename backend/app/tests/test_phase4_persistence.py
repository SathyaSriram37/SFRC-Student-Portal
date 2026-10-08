"""Phase 4 Test Suite — Career & Engagement Database Persistence Verification.
Covers:
1. Placement Drive Applications (placement_applications)
2. Confidential Student Grievances (student_grievances)
3. Sports Team Memberships (sports_memberships)
4. Campus Club Memberships (club_members)
5. YWED Skill Course Enrollments (ywed_enrollments)
6. Alumni Registration (alumni_profiles)
7. Alumni Mentorship Requests (alumni_mentorship_requests)
"""
import pytest
import os
import sqlite3
import uuid
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from jose import jwt

from app.main import app
from app.core.config import settings


def create_token(user_id: str, role: str = "student", name: str = "Test Student", reg_no: str = "21UCS042", dept: str = "CS", email: str = None) -> str:
    payload = {
        "sub": user_id,
        "id": user_id,
        "email": email or f"{user_id}@sfrc.edu.in",
        "role": "authenticated",
        "user_metadata": {
            "role": role,
            "full_name": name,
            "register_number": reg_no,
        },
        "app_metadata": {
            "role": role,
        },
        "name": name,
        "full_name": name,
        "register_number": reg_no,
        "department_code": dept,
        "cgpa": 8.5,
        "attendance_pct": 88.0,
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
    }
    secret = settings.supabase_jwt_secret or "sfrc-jwt-secret-token-key-2026"
    return jwt.encode(payload, secret, algorithm="HS256")


def query_db(query: str, params: tuple = ()):
    db_path = "college.db"
    if os.path.exists("../college.db") and os.path.getsize("../college.db") > 0:
        db_path = "../college.db"
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    return rows


@pytest.mark.asyncio
async def test_placement_drive_application_persistence():
    student_id = f"std-p4-{uuid.uuid4().hex[:6]}"
    token = create_token(user_id=student_id, role="student", name="Preethi S", reg_no="21UCS101")
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Apply for drive-tcs-001
        res = await ac.post(
            "/api/v1/placement/drives/drive-tcs-001/apply",
            json={"statement": "Passionate about full-stack cloud development."},
            headers=headers,
        )
        assert res.status_code == 200, res.text
        app_data = res.json()
        assert app_data["status"] == "applied"
        assert app_data["drive_id"] == "drive-tcs-001"

        # 2. Verify Database Row
        db_rows = query_db(
            "SELECT id, drive_id, user_id, status FROM placement_applications WHERE user_id = ?",
            (student_id,)
        )
        assert len(db_rows) == 1
        assert db_rows[0][1] == "drive-tcs-001"
        assert db_rows[0][3] == "applied"

        # 3. Retrieve student's applications
        res_list = await ac.get("/api/v1/placement/me/applications", headers=headers)
        assert res_list.status_code == 200
        apps = res_list.json()
        assert len(apps) >= 1
        assert any(a["drive_id"] == "drive-tcs-001" for a in apps)

        # 4. Duplicate Application Rejected
        res_dup = await ac.post(
            "/api/v1/placement/drives/drive-tcs-001/apply",
            json={"statement": "Duplicate apply"},
            headers=headers,
        )
        assert res_dup.status_code == 400


@pytest.mark.asyncio
async def test_student_grievance_confidential_persistence():
    student_a = f"std-grv-a-{uuid.uuid4().hex[:6]}"
    student_b = f"std-grv-b-{uuid.uuid4().hex[:6]}"
    token_a = create_token(user_id=student_a, role="student", name="Student A")
    token_b = create_token(user_id=student_b, role="student", name="Student B")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Student A submits grievance
        payload = {
            "category": "Infrastructure",
            "subject": "Physics Lab Projector Lamp Replacement",
            "description": "The overhead smart projector in Physics Laboratory 2 has flickering display issues and requires lamp maintenance.",
            "is_anonymous": False,
        }
        res = await ac.post("/api/v1/policies/grievances", json=payload, headers={"Authorization": f"Bearer {token_a}"})
        assert res.status_code == 200, res.text
        grv_data = res.json()
        ref = grv_data["reference"]

        # 2. Verify Database Row
        db_rows = query_db(
            "SELECT reference, user_id, category, status FROM student_grievances WHERE reference = ?",
            (ref,)
        )
        assert len(db_rows) == 1
        assert db_rows[0][1] == student_a
        assert db_rows[0][3] == "Received"

        # 3. Student A retrieves own grievances
        res_my = await ac.get("/api/v1/policies/grievances/me", headers={"Authorization": f"Bearer {token_a}"})
        assert res_my.status_code == 200
        my_grvs = res_my.json()["grievances"]
        assert any(g["reference"] == ref for g in my_grvs)

        # 4. Student B cannot see Student A's grievance (Confidentiality check)
        res_b = await ac.get("/api/v1/policies/grievances/me", headers={"Authorization": f"Bearer {token_b}"})
        assert res_b.status_code == 200
        b_grvs = res_b.json()["grievances"]
        assert not any(g["reference"] == ref for g in b_grvs)


@pytest.mark.asyncio
async def test_sports_team_membership_persistence():
    student_id = f"std-sprt-{uuid.uuid4().hex[:6]}"
    token = create_token(user_id=student_id, role="student", name="Kavitha M")
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Join sports team team-01
        res = await ac.post("/api/v1/sports/teams/team-01/join", headers=headers)
        assert res.status_code == 200, res.text
        assert res.json()["is_joined"] is True

        # 2. Verify Database Row
        db_rows = query_db(
            "SELECT team_id, user_id, status FROM sports_memberships WHERE user_id = ? AND team_id = 'team-01'",
            (student_id,)
        )
        assert len(db_rows) == 1
        assert db_rows[0][2] == "active"

        # 3. Verify membership in list view
        res_list = await ac.get("/api/v1/sports/teams", headers=headers)
        assert res_list.status_code == 200
        teams = res_list.json()
        t1 = next(t for t in teams if t["id"] == "team-01")
        assert t1["is_joined"] is True

        # 4. Leave team (Toggle)
        res_leave = await ac.post("/api/v1/sports/teams/team-01/join", headers=headers)
        assert res_leave.status_code == 200
        assert res_leave.json()["is_joined"] is False

        # 5. Verify Database Row updated to inactive
        db_rows_after = query_db(
            "SELECT status FROM sports_memberships WHERE user_id = ? AND team_id = 'team-01'",
            (student_id,)
        )
        assert db_rows_after[0][0] == "inactive"


@pytest.mark.asyncio
async def test_campus_club_membership_persistence():
    student_id = f"std-club-{uuid.uuid4().hex[:6]}"
    token = create_token(user_id=student_id, role="student", name="Deepa R")
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Join club-04 (Computer Club)
        res = await ac.post("/api/v1/clubs/club-04/join", headers=headers)
        assert res.status_code == 200, res.text
        assert res.json()["is_member"] is True

        # 2. Verify Database Row
        db_rows = query_db(
            "SELECT club_id, user_id, status FROM club_members WHERE user_id = ? AND club_id = 'club-04'",
            (student_id,)
        )
        assert len(db_rows) == 1
        assert db_rows[0][2] == "active"

        # 3. Retrieve clubs list
        res_list = await ac.get("/api/v1/clubs", headers=headers)
        assert res_list.status_code == 200
        clubs = res_list.json()
        c4 = next(c for c in clubs if c["id"] == "club-04")
        assert c4["is_member"] is True


@pytest.mark.asyncio
async def test_ywed_skill_course_enrollment_persistence():
    student_id = f"std-ywed-{uuid.uuid4().hex[:6]}"
    token = create_token(user_id=student_id, role="student", name="Nithya P")
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Enroll in YWED course ywed-st-01
        res = await ac.post("/api/v1/student-life/ywed-courses/ywed-st-01/enroll", headers=headers)
        assert res.status_code == 200, res.text
        assert res.json()["is_enrolled"] is True

        # 2. Verify Database Row
        db_rows = query_db(
            "SELECT course_id, user_id, status FROM ywed_enrollments WHERE user_id = ? AND course_id = 'ywed-st-01'",
            (student_id,)
        )
        assert len(db_rows) == 1
        assert db_rows[0][2] == "enrolled"

        # 3. Retrieve YWED courses list
        res_list = await ac.get("/api/v1/student-life/ywed-courses", headers=headers)
        assert res_list.status_code == 200
        courses = res_list.json()["courses"]
        crs = next(c for c in courses if c["id"] == "ywed-st-01")
        assert crs["is_enrolled"] is True


@pytest.mark.asyncio
async def test_alumni_registration_persistence():
    user_id = f"usr-alm-{uuid.uuid4().hex[:6]}"
    email = f"alumni.{uuid.uuid4().hex[:6]}@gmail.com"
    token = create_token(user_id=user_id, role="student", name="Alumni Grad", email=email)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "name": "Alumni Grad",
            "email": email,
            "department_code": "CS",
            "batch_year": 2024,
            "degree": "B.Sc Computer Science",
            "current_organization": "Amazon Web Services",
            "designation": "Associate Cloud Engineer",
            "industry": "Cloud Computing",
            "location": "Chennai",
            "skills": ["AWS", "Python", "Docker"],
            "is_mentor": True,
            "mentorship_areas": ["Cloud Roadmaps", "AWS Certification"],
            "visibility": "public",
        }
        # 1. Self register as alumni
        res = await ac.post("/api/v1/alumni/register", json=payload, headers=headers)
        assert res.status_code == 201, res.text
        alm_id = res.json()["id"]

        # 2. Verify Database Row
        db_rows = query_db(
            "SELECT id, name, email, is_mentor FROM alumni_profiles WHERE id = ?",
            (alm_id,)
        )
        assert len(db_rows) == 1
        assert db_rows[0][1] == "Alumni Grad"
        assert db_rows[0][2] == email

        # 3. Duplicate registration rejected
        res_dup = await ac.post("/api/v1/alumni/register", json=payload, headers=headers)
        assert res_dup.status_code == 400


@pytest.mark.asyncio
async def test_alumni_mentorship_request_persistence():
    student_id = f"std-mnt-{uuid.uuid4().hex[:6]}"
    token = create_token(user_id=student_id, role="student", name="Mentee Student")
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Request mentorship with alm-01
        payload = {
            "preferred_topic": "Tech Interviews & System Design",
            "message": "Dear Senior, I would appreciate guidance on technical interview preparation for software engineer roles.",
        }
        res = await ac.post("/api/v1/alumni/mentorship/request/alm-01", json=payload, headers=headers)
        assert res.status_code == 201, res.text
        req_data = res.json()
        assert req_data["status"] == "pending"

        # 2. Verify Database Row
        db_rows = query_db(
            "SELECT alumni_id, student_id, preferred_topic, status FROM alumni_mentorship_requests WHERE student_id = ?",
            (student_id,)
        )
        assert len(db_rows) == 1
        assert db_rows[0][0] == "alm-01"
        assert db_rows[0][3] == "pending"

        # 3. Retrieve student's mentorship requests
        res_list = await ac.get("/api/v1/alumni/me/mentorship-requests", headers=headers)
        assert res_list.status_code == 200
        reqs = res_list.json()
        assert len(reqs) >= 1
        assert any(r["alumni_id"] == "alm-01" for r in reqs)

        # 4. Duplicate active request rejected
        res_dup = await ac.post("/api/v1/alumni/mentorship/request/alm-01", json=payload, headers=headers)
        assert res_dup.status_code == 400
