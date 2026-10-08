import pytest
from httpx import AsyncClient, ASGITransport
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from jose import jwt
from app.main import app
from app.core.config import settings
from app.services.notification_service import NotificationService


def create_test_token(role: str = "student", user_id: str = None, extra_claims: dict = None) -> str:
    sub = user_id or str(uuid4())
    payload = {
        "sub": sub,
        "email": f"{role}_{uuid4().hex[:4]}@sfrc.edu.in",
        "role": "authenticated",
        "user_metadata": {
            "role": role,
            "full_name": "Test User",
            "register_number": "22UCA042" if role == "student" else None,
        },
        "app_metadata": {
            "role": role,
        },
        "name": "Test User",
        "register_number": "22UCA042" if role == "student" else None,
        "department_code": "CS",
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
    }
    if extra_claims:
        payload.update(extra_claims)
    secret = settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890"
    return jwt.encode(payload, secret, algorithm="HS256")


def make_auth_headers(sub: str = None, role: str = "student", full_name: str = "Test User"):
    token = create_test_token(role=role, user_id=sub, extra_claims={"name": full_name, "user_metadata": {"role": role, "full_name": full_name}})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_iqac_full_lifecycle_persistence():
    """Verify IQAC meeting creation, action items, initiatives, feedback cycles, and AQAR."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_headers = make_auth_headers(str(uuid4()), "admin", "IQAC Director")

        # 1. Dashboard summary
        resp = await client.get("/api/v1/admin/iqac/dashboard", headers=admin_headers)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "total_meetings" in data
        assert "completed_action_items" in data
        assert "aqar_documents_count" in data

        # 2. List meetings
        resp = await client.get("/api/v1/admin/iqac/meetings", headers=admin_headers)
        assert resp.status_code == 200
        meetings_data = resp.json()
        assert "items" in meetings_data
        assert len(meetings_data["items"]) >= 1

        # 3. Create meeting (Admin only)
        meeting_payload = {
            "title": "IQAC Special E2E Verification Meeting",
            "meeting_number": f"IQAC/E2E/{uuid4().hex[:6]}",
            "meeting_date": "2026-10-15",
            "venue": "Conference Hall A",
            "attendees": ["Dr. Principal", "IQAC Coordinator", "Faculty Rep"],
            "agenda": ["Review curriculum changes", "NAAC criteria updates"],
            "minutes": "Meeting held successfully with full quorum.",
            "decisions": ["Approve new courses", "Sanction laboratory funds"],
            "action_items_count": 0
        }
        create_resp = await client.post("/api/v1/admin/iqac/meetings", json=meeting_payload, headers=admin_headers)
        assert create_resp.status_code == 201, create_resp.text
        created_meet = create_resp.json()
        meet_id = created_meet["id"]
        assert created_meet["title"] == meeting_payload["title"]

        # Admin should be able to read this persisted meeting in meetings list
        get_meets = await client.get("/api/v1/admin/iqac/meetings", headers=admin_headers)
        assert get_meets.status_code == 200
        assert any(m["id"] == meet_id for m in get_meets.json()["items"])

        # 4. Create action item for this meeting
        action_payload = {
            "meeting_id": meet_id,
            "title": "Implement outcome-based course mapping",
            "responsible_person_or_dept": "Department of Computer Science",
            "target_date": "2026-11-30",
            "status": "Pending",
            "remarks": "Action item created via E2E test"
        }
        act_resp = await client.post("/api/v1/admin/iqac/action-items", json=action_payload, headers=admin_headers)
        assert act_resp.status_code == 201, act_resp.text
        created_act = act_resp.json()
        act_id = created_act["id"]

        # Read action items
        act_list_resp = await client.get("/api/v1/admin/iqac/action-items", headers=admin_headers)
        assert act_list_resp.status_code == 200
        act_items = act_list_resp.json()
        assert any(item["id"] == act_id for item in act_items)

        # Update action item status
        update_resp = await client.put(
            f"/api/v1/admin/iqac/action-items/{act_id}",
            json={"status": "Completed", "remarks": "Successfully mapped all syllabus units"},
            headers=admin_headers
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["status"] == "Completed"

        # 5. List initiatives and feedback cycles
        init_resp = await client.get("/api/v1/admin/iqac/initiatives", headers=admin_headers)
        assert init_resp.status_code == 200
        assert len(init_resp.json()) >= 1

        fb_resp = await client.get("/api/v1/admin/iqac/feedback-cycles", headers=admin_headers)
        assert fb_resp.status_code == 200
        assert len(fb_resp.json()) >= 1

        aqar_resp = await client.get("/api/v1/admin/iqac/aqar", headers=admin_headers)
        assert aqar_resp.status_code == 200
        assert len(aqar_resp.json()) >= 1


@pytest.mark.asyncio
async def test_alumni_opportunities_and_stories_persistence():
    """Verify Alumni posting opportunities, student reading them, and alumni stories retrieval."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        alumni_user_id = str(uuid4())
        alumni_headers = make_auth_headers(alumni_user_id, "alumni", "Dr. Priya Sundaram")
        student_headers = make_auth_headers(str(uuid4()), "student", "Student Applicant")

        # 1. Alumni creates a new job opportunity
        opp_payload = {
            "company_name": "Zoho Corporation",
            "role_title": "Associate Software Engineer",
            "location": "Tenkasi / Chennai",
            "opportunity_type": "Job",
            "description": "Hiring MCA/B.Sc CS graduates for product engineering and cloud database tooling.",
            "apply_link_or_email": "https://careers.zohocorp.com/jobs/ase-2026"
        }
        create_resp = await client.post("/api/v1/alumni/opportunities", json=opp_payload, headers=alumni_headers)
        assert create_resp.status_code == 201, create_resp.text
        opp_data = create_resp.json()
        assert opp_data["company_name"] == "Zoho Corporation"
        assert opp_data["alumni_name"] == "Dr. Priya Sundaram"
        opp_id = opp_data["id"]

        # 2. Student retrieves opportunities and finds the newly created one
        list_resp = await client.get("/api/v1/alumni/opportunities", headers=student_headers)
        assert list_resp.status_code == 200
        opps = list_resp.json()
        assert any(o["id"] == opp_id for o in opps)

        # 3. Alumni stories endpoint reads from database
        stories_resp = await client.get("/api/v1/alumni/stories", headers=student_headers)
        assert stories_resp.status_code == 200
        stories = stories_resp.json()
        assert isinstance(stories, list)


@pytest.mark.asyncio
async def test_acide_startups_and_transport_routes():
    """Verify ACIDE startups and transport routes from real database storage."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        student_headers = make_auth_headers(str(uuid4()), "student", "Commuter Student")
        admin_headers = make_auth_headers(str(uuid4()), "admin", "Transport Incharge")

        # 1. ACIDE Startups
        startups_resp = await client.get("/api/v1/student-life/acide-startups", headers=student_headers)
        assert startups_resp.status_code == 200
        startups = startups_resp.json()
        assert len(startups) >= 3
        startup_names = [s["startup_name"] for s in startups]
        assert "Kissan Innova" in startup_names

        # 2. Transport Routes list
        routes_resp = await client.get("/api/v1/transport/routes", headers=student_headers)
        assert routes_resp.status_code == 200
        routes = routes_resp.json()
        assert len(routes) >= 2
        route_1 = routes[0]
        route_id = route_1["id"]

        # 3. Transport route stops
        stops_resp = await client.get(f"/api/v1/transport/routes/{route_id}/stops", headers=student_headers)
        assert stops_resp.status_code == 200
        stops = stops_resp.json()
        assert len(stops) >= 1

        # 4. Admin creates a new transport route
        new_route_payload = {
            "route_number": f"Route {uuid4().hex[:4].upper()}",
            "name": "Sattur Express Route",
            "start_point": "Sattur Main Bus Stand",
            "destination": "SFRC Main Campus Terminal",
            "bus_registration": "TN 67 BB 9988",
            "driver_name": "Mr. K. Pandian",
            "driver_phone": "+91 98421 99999",
            "total_stops": 4,
            "morning_departure": "08:10 AM",
            "morning_arrival_sfrc": "08:45 AM",
            "evening_departure_sfrc": "04:15 PM",
            "evening_arrival_terminus": "04:50 PM",
            "capacity": 45,
            "occupied_seats": 20,
            "note": "Special express service.",
            "stops": [
                {"id": "st-s1", "name": "Sattur Bus Stand", "stop_order": 1, "morning_pickup_time": "08:10 AM", "evening_drop_time": "04:50 PM"},
                {"id": "st-s2", "name": "SFRC Campus", "stop_order": 2, "morning_pickup_time": "08:45 AM", "evening_drop_time": "04:15 PM"}
            ]
        }
        create_route_resp = await client.post("/api/v1/admin/transport/routes", json=new_route_payload, headers=admin_headers)
        assert create_route_resp.status_code == 201, create_route_resp.text
        created_rt = create_route_resp.json()
        assert created_rt["route_number"] == new_route_payload["route_number"]


@pytest.mark.asyncio
async def test_library_dynamic_stats_and_pragya_intent_disambiguation():
    """Verify Library statistics from DB and Pragya AI intent disambiguation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        student_headers = make_auth_headers(str(uuid4()), "student", "Student Pragya User")

        # 1. Library stats
        stats_resp = await client.get("/api/v1/library/stats", headers=student_headers)
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        assert "total_volumes" in stats
        assert "total_titles" in stats

        # 2. Pragya query: Library search
        pragya_lib_resp = await client.post(
            "/api/v1/ai/chat",
            json={"message": "Do we have Python machine learning books in the library?"},
            headers=student_headers
        )
        assert pragya_lib_resp.status_code == 200
        lib_data = pragya_lib_resp.json()
        assert "reply" in lib_data

        # 3. Pragya query: Transport route
        pragya_trans_resp = await client.post(
            "/api/v1/ai/chat",
            json={"message": "What is the bus timing and route for Route 1?"},
            headers=student_headers
        )
        assert pragya_trans_resp.status_code == 200
        trans_data = pragya_trans_resp.json()
        assert "reply" in trans_data


@pytest.mark.asyncio
async def test_cross_portal_admin_to_student_and_notifications():
    """Verify Admin action -> Student retrieval -> Notification creation and consumption."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        student_id = str(uuid4())
        student_headers = make_auth_headers(student_id, "student", "Notification Recipient")

        # 1. System/Admin dispatches a persistent notification to the student via NotificationService
        service = NotificationService()
        notif_result = await service.send(
            user_id=student_id,
            title="Semester Registration Open",
            message="Please register for your elective courses by Friday.",
            type="info",
            entity_type="registration",
            entity_id="reg-2026-sem6",
            link="/student/academics"
        )
        notif_id = notif_result["id"]

        # 2. Student retrieves their notifications
        get_notifs_resp = await client.get("/api/v1/notifications", headers=student_headers)
        assert get_notifs_resp.status_code == 200
        data = get_notifs_resp.json()
        notifs = data["notifications"]
        assert any(n["id"] == notif_id for n in notifs)

        # 3. Student marks notification as read
        mark_read_resp = await client.put(f"/api/v1/notifications/{notif_id}/read", headers=student_headers)
        assert mark_read_resp.status_code == 200
        assert mark_read_resp.json()["read"] is True

        # 4. Another student cannot mark this notification as read or delete it (RBAC & recipient isolation)
        other_student_headers = make_auth_headers(str(uuid4()), "student", "Other Student")
        unauthorized_delete = await client.delete(f"/api/v1/notifications/{notif_id}", headers=other_student_headers)
        assert unauthorized_delete.status_code in [403, 404]
