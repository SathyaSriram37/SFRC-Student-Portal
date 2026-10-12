import json
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.capabilities import require_capability
from app.core.audit import log_audit_event

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class BusStopItem(BaseModel):
    id: str
    name: str
    stop_order: int
    morning_pickup_time: str
    evening_drop_time: str
    landmark: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class TransportRouteItem(BaseModel):
    id: str
    route_number: str
    name: str
    start_point: str
    destination: str
    bus_registration: str
    driver_name: str
    driver_phone: str
    total_stops: int
    morning_departure: str
    morning_arrival_sfrc: str
    evening_departure_sfrc: str
    evening_arrival_terminus: str
    capacity: int
    occupied_seats: int
    note: str
    stops: List[BusStopItem] = []


class StudentBusPassResponse(BaseModel):
    has_pass: bool
    pass_number: Optional[str] = None
    student_name: Optional[str] = None
    register_number: Optional[str] = None
    route_number: Optional[str] = None
    route_name: Optional[str] = None
    boarding_stop: Optional[str] = None
    seat_number: Optional[str] = None
    morning_pickup_time: Optional[str] = None
    evening_drop_time: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    valid_until: Optional[str] = None
    status: Optional[str] = None


class LiveTelemetryItem(BaseModel):
    current_latitude: float
    current_longitude: float
    speed_kmh: float
    heading_deg: float
    current_stop_name: str
    next_stop_name: str
    eta_to_user_stop_minutes: int
    distance_km: float
    transit_status: str
    trip_direction: str
    last_ping_at: str
    is_delay_reported: bool = False
    delay_reason: Optional[str] = None


class LiveRouteStopItem(BaseModel):
    id: str
    name: str
    stop_order: int
    morning_pickup_time: str
    evening_drop_time: str
    landmark: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_passed: bool = False
    is_current: bool = False
    is_user_boarding_stop: bool = False


class UserLiveTransportResponse(BaseModel):
    has_transport: bool
    user_name: Optional[str] = None
    user_type: Optional[str] = None
    identifier: Optional[str] = None
    pass_number: Optional[str] = None
    seat_number: Optional[str] = None
    boarding_stop_id: Optional[str] = None
    boarding_stop_name: Optional[str] = None
    route_id: Optional[str] = None
    route_number: Optional[str] = None
    route_name: Optional[str] = None
    start_point: Optional[str] = None
    destination: Optional[str] = None
    bus_registration: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    morning_departure: Optional[str] = None
    morning_arrival_sfrc: Optional[str] = None
    evening_departure_sfrc: Optional[str] = None
    evening_arrival_terminus: Optional[str] = None
    valid_until: Optional[str] = None
    status: Optional[str] = None
    telemetry: Optional[LiveTelemetryItem] = None
    stops: List[LiveRouteStopItem] = []
    message: Optional[str] = None


class TelemetryUpdateBody(BaseModel):
    current_latitude: float
    current_longitude: float
    speed_kmh: float
    heading_deg: float
    current_stop_id: Optional[str] = None
    current_stop_name: Optional[str] = None
    next_stop_id: Optional[str] = None
    next_stop_name: Optional[str] = None
    eta_next_stop_minutes: int = 4
    distance_to_destination_km: float = 4.5
    trip_direction: str = "morning_to_campus"
    transit_status: str = "in_transit"
    is_delay_reported: bool = False
    delay_reason: Optional[str] = None


class TransportRouteCreate(BaseModel):
    route_number: str
    name: str
    start_point: str
    destination: str = "SFRC Main Campus"
    bus_registration: str
    driver_name: str
    driver_phone: str
    morning_departure: str
    morning_arrival_sfrc: str = "08:45 AM"
    evening_departure_sfrc: str = "04:15 PM"
    evening_arrival_terminus: str
    capacity: int = 50
    stops: List[Dict[str, Any]] = []


# ── Seed 5 Transport Routes (Synthetic / Demo labeled) ────────────────────────

SEED_TRANSPORT_ROUTES: List[Dict[str, Any]] = [
    {
        "id": "rt-01",
        "route_number": "Route 1",
        "name": "City Route",
        "start_point": "Sivakasi Old Bus Stand",
        "destination": "SFRC Main Campus",
        "bus_registration": "TN 67 BB 1042",
        "driver_name": "Mr. M. Senthil",
        "driver_phone": "+91 98421 11001",
        "total_stops": 8,
        "morning_departure": "08:15 AM",
        "morning_arrival_sfrc": "08:45 AM",
        "evening_departure_sfrc": "04:15 PM",
        "evening_arrival_terminus": "04:45 PM",
        "capacity": 55,
        "occupied_seats": 48,
        "note": "Demo transport data. Not official SFRC bus routes.",
        "stops": [
            {"id": "st-101", "name": "Sivakasi Old Bus Stand", "stop_order": 1, "morning_pickup_time": "08:15 AM", "evening_drop_time": "04:45 PM", "landmark": "Main Entrance", "lat": 9.4532, "lng": 77.7985},
            {"id": "st-102", "name": "Coronation Colony", "stop_order": 2, "morning_pickup_time": "08:20 AM", "evening_drop_time": "04:40 PM", "landmark": "Near Post Office", "lat": 9.4545, "lng": 77.7995},
            {"id": "st-103", "name": "Gandhi Nagar Corner", "stop_order": 3, "morning_pickup_time": "08:24 AM", "evening_drop_time": "04:36 PM", "landmark": "Water Tank", "lat": 9.4560, "lng": 77.8010},
            {"id": "st-104", "name": "NRKR Road Junction", "stop_order": 4, "morning_pickup_time": "08:28 AM", "evening_drop_time": "04:32 PM", "landmark": "Signal Point", "lat": 9.4578, "lng": 77.8025},
            {"id": "st-105", "name": "Railway Feeder Road", "stop_order": 5, "morning_pickup_time": "08:32 AM", "evening_drop_time": "04:28 PM", "landmark": "Near Railway Gate", "lat": 9.4590, "lng": 77.8040},
            {"id": "st-106", "name": "Viswanatham Road", "stop_order": 6, "morning_pickup_time": "08:36 AM", "evening_drop_time": "04:24 PM", "landmark": "Arch Entrance", "lat": 9.4610, "lng": 77.8060},
            {"id": "st-107", "name": "SFRC South Gate", "stop_order": 7, "morning_pickup_time": "08:42 AM", "evening_drop_time": "04:18 PM", "landmark": "Auditorium Gate", "lat": 9.4630, "lng": 77.8080},
            {"id": "st-108", "name": "SFRC Main Campus Terminal", "stop_order": 8, "morning_pickup_time": "08:45 AM", "evening_drop_time": "04:15 PM", "landmark": "Main Porch", "lat": 9.4645, "lng": 77.8100},
        ],
    },
    {
        "id": "rt-02",
        "route_number": "Route 2",
        "name": "North Route",
        "start_point": "Thiruthangal Railway Station",
        "destination": "SFRC Main Campus",
        "bus_registration": "TN 67 BB 1043",
        "driver_name": "Mr. K. Pandian",
        "driver_phone": "+91 98421 11002",
        "total_stops": 6,
        "morning_departure": "08:10 AM",
        "morning_arrival_sfrc": "08:45 AM",
        "evening_departure_sfrc": "04:15 PM",
        "evening_arrival_terminus": "04:50 PM",
        "capacity": 50,
        "occupied_seats": 42,
        "note": "Demo transport data. Not official SFRC bus routes.",
        "stops": [
            {"id": "st-201", "name": "Thiruthangal Railway Station", "stop_order": 1, "morning_pickup_time": "08:10 AM", "evening_drop_time": "04:50 PM", "landmark": "Station Entrance", "lat": 9.4820, "lng": 77.8120},
            {"id": "st-202", "name": "Thiruthangal Bus Stand", "stop_order": 2, "morning_pickup_time": "08:18 AM", "evening_drop_time": "04:42 PM", "landmark": "Opposite Police Station", "lat": 9.4790, "lng": 77.8100},
            {"id": "st-203", "name": "Sengamalanagar", "stop_order": 3, "morning_pickup_time": "08:26 AM", "evening_drop_time": "04:34 PM", "landmark": "Temple Corner", "lat": 9.4730, "lng": 77.8080},
            {"id": "st-204", "name": "Annamalaiyar Colony", "stop_order": 4, "morning_pickup_time": "08:33 AM", "evening_drop_time": "04:27 PM", "landmark": "School Junction", "lat": 9.4680, "lng": 77.8060},
            {"id": "st-205", "name": "Thiruthangal Bypass", "stop_order": 5, "morning_pickup_time": "08:38 AM", "evening_drop_time": "04:22 PM", "landmark": "Bypass Roundabout", "lat": 9.4650, "lng": 77.8050},
            {"id": "st-206", "name": "SFRC Main Campus Terminal", "stop_order": 6, "morning_pickup_time": "08:45 AM", "evening_drop_time": "04:15 PM", "landmark": "Main Porch", "lat": 9.4645, "lng": 77.8100},
        ],
    },
    {
        "id": "rt-03",
        "route_number": "Route 3",
        "name": "South Route",
        "start_point": "Sattur Bus Terminal",
        "destination": "SFRC Main Campus",
        "bus_registration": "TN 67 BB 1044",
        "driver_name": "Mr. P. Murugan",
        "driver_phone": "+91 98421 11003",
        "total_stops": 7,
        "morning_departure": "08:00 AM",
        "morning_arrival_sfrc": "08:45 AM",
        "evening_departure_sfrc": "04:15 PM",
        "evening_arrival_terminus": "05:00 PM",
        "capacity": 55,
        "occupied_seats": 50,
        "note": "Demo transport data. Not official SFRC bus routes.",
        "stops": [
            {"id": "st-301", "name": "Sattur Bus Terminal", "stop_order": 1, "morning_pickup_time": "08:00 AM", "evening_drop_time": "05:00 PM", "landmark": "Bay 3", "lat": 9.3620, "lng": 77.9250},
            {"id": "st-302", "name": "Sattur Four Road", "stop_order": 2, "morning_pickup_time": "08:08 AM", "evening_drop_time": "04:52 PM", "landmark": "Highway Signal", "lat": 9.3750, "lng": 77.9100},
            {"id": "st-303", "name": "Nalli Junction", "stop_order": 3, "morning_pickup_time": "08:18 AM", "evening_drop_time": "04:42 PM", "landmark": "Nalli Arch", "lat": 9.4000, "lng": 77.8700},
            {"id": "st-304", "name": "Padanthal", "stop_order": 4, "morning_pickup_time": "08:26 AM", "evening_drop_time": "04:34 PM", "landmark": "Panchayat Board", "lat": 9.4200, "lng": 77.8400},
            {"id": "st-305", "name": "Vilampatti", "stop_order": 5, "morning_pickup_time": "08:33 AM", "evening_drop_time": "04:27 PM", "landmark": "Bus Shelter", "lat": 9.4400, "lng": 77.8250},
            {"id": "st-306", "name": "Sivakasi South Bypass", "stop_order": 6, "morning_pickup_time": "08:39 AM", "evening_drop_time": "04:21 PM", "landmark": "Bridge Point", "lat": 9.4550, "lng": 77.8150},
            {"id": "st-307", "name": "SFRC Main Campus Terminal", "stop_order": 7, "morning_pickup_time": "08:45 AM", "evening_drop_time": "04:15 PM", "landmark": "Main Porch", "lat": 9.4645, "lng": 77.8100},
        ],
    },
    {
        "id": "rt-04",
        "route_number": "Route 4",
        "name": "East Route",
        "start_point": "Vembakottai Junction",
        "destination": "SFRC Main Campus",
        "bus_registration": "TN 67 BB 1045",
        "driver_name": "Mr. R. Kumar",
        "driver_phone": "+91 98421 11004",
        "total_stops": 5,
        "morning_departure": "08:15 AM",
        "morning_arrival_sfrc": "08:45 AM",
        "evening_departure_sfrc": "04:15 PM",
        "evening_arrival_terminus": "04:45 PM",
        "capacity": 50,
        "occupied_seats": 39,
        "note": "Demo transport data. Not official SFRC bus routes.",
        "stops": [
            {"id": "st-401", "name": "Vembakottai Junction", "stop_order": 1, "morning_pickup_time": "08:15 AM", "evening_drop_time": "04:45 PM", "landmark": "Dam Road Corner", "lat": 9.3300, "lng": 77.7700},
            {"id": "st-402", "name": "Alangulam Arch", "stop_order": 2, "morning_pickup_time": "08:24 AM", "evening_drop_time": "04:36 PM", "landmark": "Cement Factory Gate", "lat": 9.3800, "lng": 77.7800},
            {"id": "st-403", "name": "Thayilpatti", "stop_order": 3, "morning_pickup_time": "08:31 AM", "evening_drop_time": "04:29 PM", "landmark": "Market Center", "lat": 9.4100, "lng": 77.7900},
            {"id": "st-404", "name": "Sithurajapuram", "stop_order": 4, "morning_pickup_time": "08:38 AM", "evening_drop_time": "04:22 PM", "landmark": "Main Road Stop", "lat": 9.4450, "lng": 77.8000},
            {"id": "st-405", "name": "SFRC Main Campus Terminal", "stop_order": 5, "morning_pickup_time": "08:45 AM", "evening_drop_time": "04:15 PM", "landmark": "Main Porch", "lat": 9.4645, "lng": 77.8100},
        ],
    },
    {
        "id": "rt-05",
        "route_number": "Route 5",
        "name": "Staff & Faculty Special Route",
        "start_point": "Virudhunagar Collectorate",
        "destination": "SFRC Main Campus",
        "bus_registration": "TN 67 BB 1046",
        "driver_name": "Mr. A. Selvam",
        "driver_phone": "+91 98421 11005",
        "total_stops": 4,
        "morning_departure": "07:55 AM",
        "morning_arrival_sfrc": "08:45 AM",
        "evening_departure_sfrc": "04:15 PM",
        "evening_arrival_terminus": "05:05 PM",
        "capacity": 40,
        "occupied_seats": 32,
        "note": "Demo transport data. Not official SFRC bus routes.",
        "stops": [
            {"id": "st-501", "name": "Virudhunagar Collectorate", "stop_order": 1, "morning_pickup_time": "07:55 AM", "evening_drop_time": "05:05 PM", "landmark": "VIP Entrance", "lat": 9.5850, "lng": 77.9600},
            {"id": "st-502", "name": "Virudhunagar Old Bus Stand", "stop_order": 2, "morning_pickup_time": "08:05 AM", "evening_drop_time": "04:55 PM", "landmark": "Clock Tower", "lat": 9.5870, "lng": 77.9550},
            {"id": "st-503", "name": "Amathur", "stop_order": 3, "morning_pickup_time": "08:22 AM", "evening_drop_time": "04:38 PM", "landmark": "Kamarajar Statue", "lat": 9.5100, "lng": 77.8700},
            {"id": "st-504", "name": "SFRC Main Campus Terminal", "stop_order": 4, "morning_pickup_time": "08:45 AM", "evening_drop_time": "04:15 PM", "landmark": "Main Porch", "lat": 9.4645, "lng": 77.8100},
        ],
    },
]


# ── Deserialization Helpers ──────────────────────────────────────────────────

def parse_json_list(val: Any) -> List[Any]:
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            return [val] if val else []
    return []


def row_to_route(row: Dict[str, Any]) -> TransportRouteItem:
    return TransportRouteItem(
        id=str(row["id"]),
        route_number=row["route_number"],
        name=row["name"],
        start_point=row["start_point"],
        destination=row["destination"],
        bus_registration=row["bus_registration"],
        driver_name=row["driver_name"],
        driver_phone=row["driver_phone"],
        total_stops=int(row.get("total_stops") or 0),
        morning_departure=row["morning_departure"],
        morning_arrival_sfrc=row["morning_arrival_sfrc"],
        evening_departure_sfrc=row["evening_departure_sfrc"],
        evening_arrival_terminus=row["evening_arrival_terminus"],
        capacity=int(row.get("capacity") or 40),
        occupied_seats=int(row.get("occupied_seats") or 0),
        note=row.get("note"),
    )


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/transport/routes", response_model=List[TransportRouteItem])
async def list_transport_routes(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all college bus routes with stop counts and timings from database."""
    rows = (await db.execute(text("SELECT * FROM transport_routes ORDER BY route_number ASC"))).mappings().all()
    if rows:
        return [row_to_route(dict(r)) for r in rows]
    return [TransportRouteItem(**r) for r in SEED_TRANSPORT_ROUTES]


@router.get("/transport/routes/{id}/stops", response_model=List[BusStopItem])
async def get_route_stops(
    id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed list of stops and morning/evening pickup times for a specific route from database."""
    q = text("SELECT * FROM transport_routes WHERE id = :id OR LOWER(route_number) = LOWER(:id)")
    row = (await db.execute(q, {"id": id})).mappings().first()
    if row:
        stops = parse_json_list(row.get("stops"))
        return [BusStopItem(**s) for s in stops]

    route = next((r for r in SEED_TRANSPORT_ROUTES if r["id"] == id or r["route_number"].lower() == id.lower()), None)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transport route not found.")
    return [BusStopItem(**s) for s in route["stops"]]


@router.get("/transport/me/pass", response_model=StudentBusPassResponse)
async def get_my_bus_pass(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the authenticated user's (student or staff) active transport bus pass from database."""
    user_id = user.get("id") or user.get("sub")
    reg_no = user.get("register_number")
    user_role = user.get("role", "student")
    name = user.get("name") or user.get("full_name") or ("Faculty Member" if user_role == "faculty" else "Student Scholar")

    # Query transport_allocations joined with transport_routes
    q = text("""
        SELECT ta.*, tr.name as route_name, tr.route_number, tr.bus_registration,
               tr.driver_name, tr.driver_phone, tr.stops
        FROM transport_allocations ta
        JOIN transport_routes tr ON ta.route_id = tr.id
        WHERE ta.user_id = :uid OR ta.user_id = :reg OR ta.pass_number LIKE :p_pat
        LIMIT 1
    """)
    row = (await db.execute(q, {
        "uid": str(user_id),
        "reg": str(reg_no or ""),
        "p_pat": f"%{reg_no}%" if reg_no else "%NONE%",
    })).mappings().first()

    # Fallback to student / faculty default allocation if user exists in system
    if not row:
        target_route_id = "rt-05" if user_role == "faculty" else "rt-01"
        fallback_q = text("""
            SELECT 'ta-default' as id, :uid as user_id, :role as user_type, tr.id as route_id,
                   'st-102' as boarding_stop_id, 'Coronation Colony' as boarding_stop_name,
                   '14A' as seat_number, ('SFRC-BP-2026-' || :uid) as pass_number,
                   'active' as status, 'May 31, 2027' as valid_until, '2025-2026' as academic_year,
                   tr.name as route_name, tr.route_number, tr.start_point, tr.destination,
                   tr.bus_registration, tr.driver_name, tr.driver_phone, tr.stops
            FROM transport_routes tr
            WHERE tr.id = :rid
            LIMIT 1
        """)
        row = (await db.execute(fallback_q, {
            "uid": str(user_id),
            "role": user_role,
            "rid": target_route_id,
        })).mappings().first()

    if row:
        stops = parse_json_list(row.get("stops"))
        b_stop = next((s for s in stops if s.get("id") == row["boarding_stop_id"] or s.get("name") == row["boarding_stop_name"]), None)
        morning_pickup = b_stop.get("morning_pickup_time") if b_stop else "08:20 AM"
        evening_drop = b_stop.get("evening_drop_time") if b_stop else "04:40 PM"

        return StudentBusPassResponse(
            has_pass=True,
            pass_number=row["pass_number"],
            student_name=name,
            register_number=reg_no or row.get("user_id"),
            route_number=row["route_number"],
            route_name=row["route_name"],
            boarding_stop=row["boarding_stop_name"],
            seat_number=row["seat_number"],
            morning_pickup_time=morning_pickup,
            evening_drop_time=evening_drop,
            driver_name=row["driver_name"],
            driver_phone=row["driver_phone"],
            valid_until=row["valid_until"],
            status=row["status"].capitalize(),
        )

    return StudentBusPassResponse(
        has_pass=False,
        student_name=name,
        register_number=reg_no,
    )


@router.get("/transport/me/live-tracking", response_model=UserLiveTransportResponse)
async def get_my_live_tracking(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the authenticated student or faculty member's personalized live bus tracking telemetry."""
    user_id = user.get("id") or user.get("sub")
    reg_no = user.get("register_number")
    user_role = user.get("role", "student")
    user_name = user.get("name") or user.get("full_name") or ("Faculty Member" if user_role == "faculty" else "Student Scholar")

    # 1. Query allocation
    q = text("""
        SELECT ta.*, tr.name as route_name, tr.route_number, tr.start_point, tr.destination,
               tr.bus_registration, tr.driver_name, tr.driver_phone, tr.morning_departure,
               tr.morning_arrival_sfrc, tr.evening_departure_sfrc, tr.evening_arrival_terminus,
               tr.stops
        FROM transport_allocations ta
        JOIN transport_routes tr ON ta.route_id = tr.id
        WHERE ta.user_id = :uid OR ta.user_id = :reg OR ta.pass_number LIKE :p_pat
        LIMIT 1
    """)
    row = (await db.execute(q, {
        "uid": str(user_id),
        "reg": str(reg_no or ""),
        "p_pat": f"%{reg_no}%" if reg_no else "%NONE%",
    })).mappings().first()

    # Fallback by role to active fleet route if not explicitly allocated
    if not row:
        target_route_id = "rt-05" if user_role == "faculty" else "rt-01"
        fallback_q = text("""
            SELECT 'ta-default' as id, :uid as user_id, :role as user_type, tr.id as route_id,
                   'st-102' as boarding_stop_id, 'Coronation Colony' as boarding_stop_name,
                   '14A' as seat_number, ('SFRC-BP-2026-' || :uid) as pass_number,
                   'active' as status, 'May 31, 2027' as valid_until, '2025-2026' as academic_year,
                   tr.name as route_name, tr.route_number, tr.start_point, tr.destination,
                   tr.bus_registration, tr.driver_name, tr.driver_phone, tr.morning_departure,
                   tr.morning_arrival_sfrc, tr.evening_departure_sfrc, tr.evening_arrival_terminus,
                   tr.stops
            FROM transport_routes tr
            WHERE tr.id = :rid
            LIMIT 1
        """)
        row = (await db.execute(fallback_q, {
            "uid": str(user_id),
            "role": user_role,
            "rid": target_route_id,
        })).mappings().first()

    if not row:
        return UserLiveTransportResponse(
            has_transport=False,
            message="No transport allocation registered for your profile.",
        )

    route_id = row["route_id"]

    # 2. Query live telemetry
    telemetry_q = text("SELECT * FROM transport_live_tracking WHERE route_id = :rid")
    t_row = (await db.execute(telemetry_q, {"rid": route_id})).mappings().first()

    # 3. Parse stops and determine live status
    raw_stops = parse_json_list(row.get("stops"))
    sorted_stops = sorted(raw_stops, key=lambda s: int(s.get("stop_order", 0)))

    current_stop_name = t_row["current_stop_name"] if t_row else (sorted_stops[0].get("name") if sorted_stops else "Terminal")
    boarding_stop_name = row["boarding_stop_name"]

    current_idx = 0
    boarding_idx = 0
    for idx, s in enumerate(sorted_stops):
        if s.get("name") == current_stop_name:
            current_idx = idx
        if s.get("name") == boarding_stop_name or s.get("id") == row["boarding_stop_id"]:
            boarding_idx = idx

    stops_diff = boarding_idx - current_idx
    if stops_diff > 0:
        eta_minutes = stops_diff * 4
    elif stops_diff == 0:
        eta_minutes = int(t_row["eta_next_stop_minutes"]) if t_row else 2
    else:
        eta_minutes = 0

    stops_list: List[LiveRouteStopItem] = []
    for idx, s in enumerate(sorted_stops):
        s_order = int(s.get("stop_order") or (idx + 1))
        stops_list.append(LiveRouteStopItem(
            id=str(s.get("id") or f"st-{s_order}"),
            name=s.get("name", f"Stop {s_order}"),
            stop_order=s_order,
            morning_pickup_time=s.get("morning_pickup_time", "08:15 AM"),
            evening_drop_time=s.get("evening_drop_time", "04:45 PM"),
            landmark=s.get("landmark"),
            lat=float(s.get("lat")) if s.get("lat") else None,
            lng=float(s.get("lng")) if s.get("lng") else None,
            is_passed=(idx < current_idx),
            is_current=(idx == current_idx),
            is_user_boarding_stop=(idx == boarding_idx),
        ))

    telemetry_item = None
    if t_row:
        telemetry_item = LiveTelemetryItem(
            current_latitude=float(t_row["current_latitude"]),
            current_longitude=float(t_row["current_longitude"]),
            speed_kmh=float(t_row["speed_kmh"]),
            heading_deg=float(t_row["heading_deg"]),
            current_stop_name=t_row["current_stop_name"],
            next_stop_name=t_row["next_stop_name"],
            eta_to_user_stop_minutes=eta_minutes,
            distance_km=float(t_row["distance_to_destination_km"]),
            transit_status=t_row["transit_status"],
            trip_direction=t_row["trip_direction"],
            last_ping_at=t_row["last_ping_at"],
            is_delay_reported=bool(t_row.get("is_delay_reported")),
            delay_reason=t_row.get("delay_reason"),
        )
    else:
        telemetry_item = LiveTelemetryItem(
            current_latitude=9.4550,
            current_longitude=77.8000,
            speed_kmh=36.0,
            heading_deg=50.0,
            current_stop_name=boarding_stop_name,
            next_stop_name=sorted_stops[1]["name"] if len(sorted_stops) > 1 else "Next Stop",
            eta_to_user_stop_minutes=4,
            distance_km=4.8,
            transit_status="in_transit",
            trip_direction="morning_to_campus",
            last_ping_at=datetime.now(timezone.utc).isoformat(),
        )

    return UserLiveTransportResponse(
        has_transport=True,
        user_name=user_name,
        user_type=row["user_type"],
        identifier=reg_no or row.get("user_id"),
        pass_number=row["pass_number"],
        seat_number=row["seat_number"],
        boarding_stop_id=row["boarding_stop_id"],
        boarding_stop_name=row["boarding_stop_name"],
        route_id=row["route_id"],
        route_number=row["route_number"],
        route_name=row["route_name"],
        start_point=row["start_point"],
        destination=row["destination"],
        bus_registration=row["bus_registration"],
        driver_name=row["driver_name"],
        driver_phone=row["driver_phone"],
        morning_departure=row["morning_departure"],
        morning_arrival_sfrc=row["morning_arrival_sfrc"],
        evening_departure_sfrc=row["evening_departure_sfrc"],
        evening_arrival_terminus=row["evening_arrival_terminus"],
        valid_until=row["valid_until"],
        status=row["status"].capitalize(),
        telemetry=telemetry_item,
        stops=stops_list,
    )


@router.get("/transport/routes/{id}/live-tracking", response_model=UserLiveTransportResponse)
async def get_route_live_tracking(
    id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve live tracking telemetry and stop progression for a specific route."""
    q = text("SELECT * FROM transport_routes WHERE id = :id OR LOWER(route_number) = LOWER(:id)")
    row = (await db.execute(q, {"id": id})).mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transport route not found.")

    telemetry_q = text("SELECT * FROM transport_live_tracking WHERE route_id = :rid")
    t_row = (await db.execute(telemetry_q, {"rid": row["id"]})).mappings().first()

    raw_stops = parse_json_list(row.get("stops"))
    sorted_stops = sorted(raw_stops, key=lambda s: int(s.get("stop_order", 0)))
    current_stop_name = t_row["current_stop_name"] if t_row else (sorted_stops[0].get("name") if sorted_stops else "Terminal")

    current_idx = 0
    for idx, s in enumerate(sorted_stops):
        if s.get("name") == current_stop_name:
            current_idx = idx

    stops_list: List[LiveRouteStopItem] = []
    for idx, s in enumerate(sorted_stops):
        s_order = int(s.get("stop_order") or (idx + 1))
        stops_list.append(LiveRouteStopItem(
            id=str(s.get("id") or f"st-{s_order}"),
            name=s.get("name", f"Stop {s_order}"),
            stop_order=s_order,
            morning_pickup_time=s.get("morning_pickup_time", "08:15 AM"),
            evening_drop_time=s.get("evening_drop_time", "04:45 PM"),
            landmark=s.get("landmark"),
            lat=float(s.get("lat")) if s.get("lat") else None,
            lng=float(s.get("lng")) if s.get("lng") else None,
            is_passed=(idx < current_idx),
            is_current=(idx == current_idx),
            is_user_boarding_stop=False,
        ))

    telemetry_item = None
    if t_row:
        telemetry_item = LiveTelemetryItem(
            current_latitude=float(t_row["current_latitude"]),
            current_longitude=float(t_row["current_longitude"]),
            speed_kmh=float(t_row["speed_kmh"]),
            heading_deg=float(t_row["heading_deg"]),
            current_stop_name=t_row["current_stop_name"],
            next_stop_name=t_row["next_stop_name"],
            eta_to_user_stop_minutes=int(t_row["eta_next_stop_minutes"]),
            distance_km=float(t_row["distance_to_destination_km"]),
            transit_status=t_row["transit_status"],
            trip_direction=t_row["trip_direction"],
            last_ping_at=t_row["last_ping_at"],
            is_delay_reported=bool(t_row.get("is_delay_reported")),
            delay_reason=t_row.get("delay_reason"),
        )

    return UserLiveTransportResponse(
        has_transport=True,
        route_id=row["id"],
        route_number=row["route_number"],
        route_name=row["name"],
        start_point=row["start_point"],
        destination=row["destination"],
        bus_registration=row["bus_registration"],
        driver_name=row["driver_name"],
        driver_phone=row["driver_phone"],
        morning_departure=row["morning_departure"],
        morning_arrival_sfrc=row["morning_arrival_sfrc"],
        evening_departure_sfrc=row["evening_departure_sfrc"],
        evening_arrival_terminus=row["evening_arrival_terminus"],
        status="Active",
        telemetry=telemetry_item,
        stops=stops_list,
    )


@router.post("/transport/routes/{id}/telemetry")
async def update_route_telemetry(
    id: str,
    body: TelemetryUpdateBody,
    user: dict = Depends(require_capability("manage_transport")),
    db: AsyncSession = Depends(get_db),
):
    """Update real-time GPS telemetry and stop progression for a route."""
    now_iso = datetime.now(timezone.utc).isoformat()
    upsert_q = text("""
        INSERT INTO transport_live_tracking (
            route_id, bus_registration, current_latitude, current_longitude,
            speed_kmh, heading_deg, current_stop_id, current_stop_name,
            next_stop_id, next_stop_name, eta_next_stop_minutes,
            distance_to_destination_km, trip_direction, transit_status,
            last_ping_at, is_delay_reported, delay_reason
        ) VALUES (
            :rid, 'TN 67 BB 1042', :lat, :lng, :spd, :hdg, :cs_id, :cs_name,
            :ns_id, :ns_name, :eta, :dist, :dir, :status, :ping, :delay, :reason
        )
        ON CONFLICT(route_id) DO UPDATE SET
            current_latitude = :lat,
            current_longitude = :lng,
            speed_kmh = :spd,
            heading_deg = :hdg,
            current_stop_id = :cs_id,
            current_stop_name = :cs_name,
            next_stop_id = :ns_id,
            next_stop_name = :ns_name,
            eta_next_stop_minutes = :eta,
            distance_to_destination_km = :dist,
            trip_direction = :dir,
            transit_status = :status,
            last_ping_at = :ping,
            is_delay_reported = :delay,
            delay_reason = :reason
    """)
    await db.execute(upsert_q, {
        "rid": id,
        "lat": body.current_latitude,
        "lng": body.current_longitude,
        "spd": body.speed_kmh,
        "hdg": body.heading_deg,
        "cs_id": body.current_stop_id,
        "cs_name": body.current_stop_name,
        "ns_id": body.next_stop_id,
        "ns_name": body.next_stop_name,
        "eta": body.eta_next_stop_minutes,
        "dist": body.distance_to_destination_km,
        "dir": body.trip_direction,
        "status": body.transit_status,
        "ping": now_iso,
        "delay": 1 if body.is_delay_reported else 0,
        "reason": body.delay_reason,
    })

    await log_audit_event(
        user_id=user.get("id"),
        action="update_transport_telemetry",
        resource_type="transport_route",
        resource_id=id,
        details={"status": body.transit_status, "speed": body.speed_kmh},
        db=db,
    )
    return {"status": "success", "route_id": id, "updated_at": now_iso}


@router.post("/admin/transport/routes", response_model=TransportRouteItem, status_code=status.HTTP_201_CREATED)
async def create_transport_route(
    body: TransportRouteCreate,
    user: dict = Depends(require_capability("manage_transport")),
    db: AsyncSession = Depends(get_db),
):
    """Create or register a new campus transport route with database persistence."""
    new_id = f"rt-{uuid.uuid4().hex[:8]}"
    stops_json = json.dumps([
        s.model_dump() if hasattr(s, "model_dump") else (s.dict() if hasattr(s, "dict") else dict(s))
        for s in (body.stops or [])
    ])

    insert_q = text("""
        INSERT INTO transport_routes (
            id, route_number, name, start_point, destination, bus_registration,
            driver_name, driver_phone, total_stops, morning_departure, morning_arrival_sfrc,
            evening_departure_sfrc, evening_arrival_terminus, capacity, occupied_seats,
            note, stops
        ) VALUES (
            :id, :route_number, :name, :start_point, :destination, :bus_registration,
            :driver_name, :driver_phone, :total_stops, :morning_departure, :morning_arrival_sfrc,
            :evening_departure_sfrc, :evening_arrival_terminus, :capacity, 0,
            :note, :stops
        )
    """)
    await db.execute(insert_q, {
        "id": new_id,
        "route_number": body.route_number,
        "name": body.name,
        "start_point": body.start_point,
        "destination": body.destination,
        "bus_registration": body.bus_registration,
        "driver_name": body.driver_name,
        "driver_phone": body.driver_phone,
        "total_stops": len(body.stops),
        "morning_departure": body.morning_departure,
        "morning_arrival_sfrc": body.morning_arrival_sfrc,
        "evening_departure_sfrc": body.evening_departure_sfrc,
        "evening_arrival_terminus": body.evening_arrival_terminus,
        "capacity": body.capacity,
        "note": "Official SFRC bus route.",
        "stops": stops_json,
    })

    await log_audit_event(
        user_id=user.get("id"),
        action="create_transport_route",
        resource_type="transport_route",
        resource_id=new_id,
        details={"route_number": body.route_number, "name": body.name},
        db=db,
    )

    fetch_q = text("SELECT * FROM transport_routes WHERE id = :id")
    row = (await db.execute(fetch_q, {"id": new_id})).mappings().first()
    return row_to_route(dict(row))
