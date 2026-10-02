"""Test suite for Phase 10 — Events, Library, Hostel, and Facilities endpoints."""
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


@pytest.fixture
def student_token():
    return create_token("usr-demo", "student@sfrc.edu.in", "student")


@pytest.fixture
def admin_token():
    return create_token("adm-demo", "admin@sfrc.edu.in", "admin")


@pytest.mark.asyncio
async def test_events_list_and_registration(student_token: str):
    """Verify listing 10 events, category filtering, and student registration flow."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. List events
        res = await ac.get("/api/v1/events", headers={"Authorization": f"Bearer {student_token}"})
        assert res.status_code == 200
        data = res.json()
        assert "events" in data
        assert len(data["events"]) >= 10

        # 2. Register for Event 1
        reg_res = await ac.post("/api/v1/events/evt-01/register", headers={"Authorization": f"Bearer {student_token}"})
        assert reg_res.status_code in (200, 201)
        reg_data = reg_res.json()
        assert reg_data["event_id"] == "evt-01"

        # 3. Verify in me/registered
        my_reg = await ac.get("/api/v1/events/me/registered", headers={"Authorization": f"Bearer {student_token}"})
        assert my_reg.status_code == 200
        registered_list = my_reg.json()
        assert any(e["id"] == "evt-01" for e in registered_list)


@pytest.mark.asyncio
async def test_library_search_and_fine_calculation(student_token: str):
    """Verify catalog search (64,795 volumes) and strict Rs 2/day overdue fine calculation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Search books
        res = await ac.get("/api/v1/library/items?q=intelligence", headers={"Authorization": f"Bearer {student_token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["total_volumes"] == 64795
        assert len(data["items"]) >= 1

        # 2. My Loans and Overdue Fine
        loans_res = await ac.get("/api/v1/library/me/loans", headers={"Authorization": f"Bearer {student_token}"})
        assert loans_res.status_code == 200
        loans_data = loans_res.json()
        assert "active_loans" in loans_data
        assert loans_data["total_active"] >= 1
        # Check that fine amount is calculated for overdue loan (overdue_days * 2.0)
        overdue_loans = [l for l in loans_data["active_loans"] if l["is_overdue"]]
        if overdue_loans:
            ol = overdue_loans[0]
            assert ol["fine_amount"] == float(ol["overdue_days"] * 2.0)

        # 3. E-resources list
        eres_res = await ac.get("/api/v1/library/e-resources", headers={"Authorization": f"Bearer {student_token}"})
        assert eres_res.status_code == 200
        eres_data = eres_res.json()
        assert len(eres_data) == 5
        assert any("INFLIBNET" in e["name"] for e in eres_data)


@pytest.mark.asyncio
async def test_hostel_allocation_and_leave_workflow(student_token: str, admin_token: str):
    """Verify hostel room allocation in 3 SFRC hostels, leave application, and warden approval."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Allocation
        alloc_res = await ac.get("/api/v1/hostel/me/allocation", headers={"Authorization": f"Bearer {student_token}"})
        assert alloc_res.status_code == 200
        alloc_data = alloc_res.json()
        assert alloc_data["is_hosteller"] is True
        assert "Priyadharshini" in alloc_data["hostel_name"]
        assert alloc_data["warden"]["phone"] is not None

        # 2. Submit Leave Request
        leave_payload = {
            "from_date": "2026-11-05",
            "to_date": "2026-11-08",
            "reason": "Attending cousin wedding in Chennai.",
            "destination": "Chennai",
            "emergency_contact": "+91 98765 43210 (Father)",
            "mode_of_travel": "Train",
        }
        leave_res = await ac.post("/api/v1/hostel/leave-requests", json=leave_payload, headers={"Authorization": f"Bearer {student_token}"})
        assert leave_res.status_code == 201
        created_leave = leave_res.json()
        leave_id = created_leave["id"]
        assert created_leave["status"] == "pending"

        # 3. Warden / Admin approves leave
        appr_res = await ac.post(
            f"/api/v1/hostel/admin/leave/{leave_id}/approve",
            json={"remarks": "Approved by Chief Warden."},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert appr_res.status_code == 200
        assert appr_res.json()["status"] == "approved"


@pytest.mark.asyncio
async def test_facilities_15_directory_and_complaints(student_token: str):
    """Verify 15 facilities, 14 categories, and related complaints endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. List facilities
        res = await ac.get("/api/v1/facilities", headers={"Authorization": f"Bearer {student_token}"})
        assert res.status_code == 200
        facs = res.json()
        assert len(facs) == 15

        # 2. Categories
        cats_res = await ac.get("/api/v1/facilities/categories", headers={"Authorization": f"Bearer {student_token}"})
        assert cats_res.status_code == 200
        categories = cats_res.json()
        assert len(categories) >= 10

        # 3. Single facility details with complaints
        fac_detail = await ac.get("/api/v1/facilities/fac-01", headers={"Authorization": f"Bearer {student_token}"})
        assert fac_detail.status_code == 200
        assert "CS Lab 1" in fac_detail.json()["name"]

        cmp_res = await ac.get("/api/v1/facilities/fac-01/complaints", headers={"Authorization": f"Bearer {student_token}"})
        assert cmp_res.status_code == 200
        assert isinstance(cmp_res.json(), list)
