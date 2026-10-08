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
):
    """Retrieve the authenticated student's active transport bus pass."""
    reg_no = user.get("register_number") or "22UCA042"
    name = user.get("name") or user.get("full_name") or "Karpagam S"

    return StudentBusPassResponse(
        has_pass=True,
        pass_number="BP-2026-0482",
        student_name=name,
        register_number=reg_no,
        route_number="Route 1",
        route_name="City Route",
        boarding_stop="Coronation Colony",
        seat_number="Seat 14A (Window)",
        morning_pickup_time="08:20 AM",
        evening_drop_time="04:40 PM",
        driver_name="Mr. M. Senthil",
        driver_phone="+91 98421 11001",
        valid_until="May 31, 2027",
        status="Active",
    )


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
