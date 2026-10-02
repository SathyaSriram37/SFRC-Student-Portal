"""Phase 17 Test Suite — Maps Provider Abstraction, Transport Routes & Pass, and Sports Teams & Achievements."""
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from jose import jwt

from app.main import app
from app.core.config import settings
from app.integrations.maps.google_maps import GoogleMapsProvider
from app.integrations.maps.fallback import NoMapsProvider
from app.integrations.maps.provider_factory import get_maps_provider


def create_test_token(role: str = "student", user_id: str = None) -> str:
    sub = user_id or "00000000-0000-0000-0000-000000000001"
    payload = {
        "sub": sub,
        "email": f"{role}@sfrc.edu.in",
        "role": "authenticated",
        "user_metadata": {
            "role": role,
            "full_name": "Karpagam S",
            "register_number": "22UCA042",
        },
        "app_metadata": {
            "role": role,
        },
        "name": "Karpagam S",
        "register_number": "22UCA042",
        "department_code": "CS",
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
    }
    secret = settings.supabase_jwt_secret or "test-jwt-secret-key-1234567890"
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture
def student_auth_headers():
    token = create_test_token(role="student")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers():
    token = create_test_token(role="admin", user_id="00000000-0000-0000-0000-000000000004")
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_facility_map_endpoint_and_key_isolation(student_auth_headers):
    """Test 1: GET /api/v1/facilities/{id}/map returns location and map URL without exposing raw API key."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/facilities/fac-01/map", headers=student_auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "lat" in data
        assert "lng" in data
        assert "building" in data
        assert "location_text" in data
        # Ensure API key is never present as a separate field in response payload
        assert "api_key" not in data
        assert "GOOGLE_MAPS_API_KEY" not in data


@pytest.mark.asyncio
async def test_maps_provider_abstraction():
    """Test 2: MapsProvider factory returns NoMapsProvider when key is empty and GoogleMapsProvider when configured."""
    no_map = NoMapsProvider()
    url = await no_map.get_static_map_url(lat=9.4528, lng=77.8000)
    assert url is None

    gmap = GoogleMapsProvider(api_key="AIzaSyDummyTestKey")
    gmap_url = await gmap.get_static_map_url(lat=9.4528, lng=77.8000)
    assert gmap_url is not None
    assert "https://maps.googleapis.com/maps/api/staticmap" in gmap_url
    assert "AIzaSyDummyTestKey" in gmap_url


@pytest.mark.asyncio
async def test_transport_routes_and_stops(student_auth_headers):
    """Test 3: Transport routes list 5 demo routes and stop schedule."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        routes_res = await ac.get("/api/v1/transport/routes", headers=student_auth_headers)
        assert routes_res.status_code == 200
        routes = routes_res.json()
        assert len(routes) == 5
        assert any(r["route_number"] == "Route 1" for r in routes)

        # Get stops for Route 1
        stops_res = await ac.get("/api/v1/transport/routes/rt-01/stops", headers=student_auth_headers)
        assert stops_res.status_code == 200
        stops = stops_res.json()
        assert len(stops) == 8
        assert stops[0]["name"] == "Sivakasi Old Bus Stand"


@pytest.mark.asyncio
async def test_student_bus_pass(student_auth_headers):
    """Test 4: GET /api/v1/transport/me/pass returns authenticated student's active bus pass."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/transport/me/pass", headers=student_auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["has_pass"] is True
        assert data["route_number"] == "Route 1"
        assert data["boarding_stop"] == "Coronation Colony"
        assert "driver_name" in data


@pytest.mark.asyncio
async def test_sports_teams_and_join_toggle(student_auth_headers):
    """Test 5: Sports teams list 8 teams and join/leave toggle updates membership."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        teams_res = await ac.get("/api/v1/sports/teams", headers=student_auth_headers)
        assert teams_res.status_code == 200
        teams = teams_res.json()
        assert len(teams) == 8
        sports_names = [t["sport"] for t in teams]
        for expected in ["Cricket", "Kabaddi", "Volleyball", "Throwball", "Badminton", "Table Tennis", "Chess", "Athletics"]:
            assert expected in sports_names

        # Toggle join for Kabaddi team (team-02)
        initial_status = next(t["is_joined"] for t in teams if t["id"] == "team-02")
        join_res = await ac.post("/api/v1/sports/teams/team-02/join", headers=student_auth_headers)
        assert join_res.status_code == 200
        assert join_res.json()["is_joined"] is not initial_status


@pytest.mark.asyncio
async def test_sports_events_and_achievements(student_auth_headers):
    """Test 6: Sports events list matches/tournaments and achievements wall."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        events_res = await ac.get("/api/v1/sports/events", headers=student_auth_headers)
        assert events_res.status_code == 200
        events = events_res.json()
        assert len(events) >= 8
        upcoming = [e for e in events if e["status"] == "upcoming"]
        completed = [e for e in events if e["status"] == "completed"]
        assert len(upcoming) >= 3
        assert len(completed) >= 5

        ach_res = await ac.get("/api/v1/sports/achievements", headers=student_auth_headers)
        assert ach_res.status_code == 200
        achievements = ach_res.json()
        assert len(achievements) == 5
        assert any("Gold Medal" in a["position"] for a in achievements)
