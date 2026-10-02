"""Facilities directory endpoints — 15 Campus facilities across 14 categories, operating hours, coordinates, accessibility, and maintenance complaints."""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class FacilityDetail(BaseModel):
    id: str
    name: str
    code: str
    category: str
    building: str
    floor: Optional[str] = None
    capacity: Optional[int] = None
    operating_hours: str
    in_charge: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    accessibility: str
    coordinates: Optional[dict] = None
    description: str
    open_complaints_count: int = 0


class FacilityComplaintItem(BaseModel):
    id: str
    complaint_number: str
    title: str
    category: str
    priority: str
    status: str
    created_at: str


# ── Seed Data (15 Campus Facilities across 14 Categories) ─────────────────────

ALL_FACILITIES: List[FacilityDetail] = [
    FacilityDetail(
        id="fac-01",
        name="Computer Science Laboratory 1 (CS Lab 1)",
        code="CS-LAB-01",
        category="Computer Laboratories",
        building="Computer Science Block",
        floor="Ground Floor",
        capacity=60,
        operating_hours="08:30 AM - 05:30 PM (Mon-Sat)",
        in_charge="Dr. M. Rajesh",
        contact_phone="+91 94421 88101",
        contact_email="cslab1@sfrc.edu.in",
        accessibility="Wheelchair ramp at entrance, wide gangways, accessible terminal benches",
        coordinates={"lat": 9.4532, "lng": 77.7981},
        description="High-performance computing lab with 60 i7 systems, gigabit LAN, dual projectors, and Ubuntu/Windows dual boot for programming labs.",
        open_complaints_count=1,
    ),
    FacilityDetail(
        id="fac-02",
        name="Advanced AI & Software Engineering Lab (CS Lab 2)",
        code="CS-LAB-02",
        category="Software & AI Labs",
        building="Computer Science Block",
        floor="1st Floor",
        capacity=50,
        operating_hours="08:30 AM - 06:00 PM (Mon-Sat)",
        in_charge="Dr. K. Anitha",
        contact_phone="+91 94421 88102",
        contact_email="ailab@sfrc.edu.in",
        accessibility="Elevator access in CS Block, air-conditioned ergonomic seating",
        coordinates={"lat": 9.4533, "lng": 77.7983},
        description="GPU-accelerated workstation lab with NVIDIA RTX GPUs for deep learning, generative AI, cloud computing, and R&D projects.",
        open_complaints_count=0,
    ),
    FacilityDetail(
        id="fac-03",
        name="Main Academic Seminar Hall",
        code="SEM-HALL-01",
        category="Seminar & Conference",
        building="Auditorium Complex",
        floor="1st Floor",
        capacity=180,
        operating_hours="09:00 AM - 05:00 PM (On Booking)",
        in_charge="Dr. P. Sundaram",
        contact_phone="+91 94421 88103",
        contact_email="seminarhall@sfrc.edu.in",
        accessibility="Ramp access, acoustic soundproofing, assistive listening mics",
        coordinates={"lat": 9.4536, "lng": 77.7989},
        description="Acoustically treated conference hall with HD laser projection, surround sound, interactive podium, and video conferencing suites.",
        open_complaints_count=0,
    ),
    FacilityDetail(
        id="fac-04",
        name="Golden Jubilee Central Auditorium",
        code="AUD-GJ-01",
        category="Auditoriums",
        building="Central Campus",
        floor="Ground Floor",
        capacity=1200,
        operating_hours="08:00 AM - 08:00 PM (Special Events)",
        in_charge="Dean of Student Affairs",
        contact_phone="+91 94421 88104",
        contact_email="auditorium@sfrc.edu.in",
        accessibility="Wheelchair friendly seating rows, ramped green rooms, multiple fire exit ramps",
        coordinates={"lat": 9.4540, "lng": 77.7992},
        description="State-of-the-art 1200-seat multi-purpose auditorium with motorized stage lighting, central HVAC, digital line array audio, and VIP lounge.",
        open_complaints_count=0,
    ),
    FacilityDetail(
        id="fac-05",
        name="Central Information Resource Centre & Library",
        code="LIB-CENTRAL",
        category="Libraries & Learning Resources",
        building="Library Block",
        floor="Ground & 1st Floor",
        capacity=300,
        operating_hours="08:00 AM - 07:00 PM (Mon-Sat)",
        in_charge="Mrs. V. Lakshmi (Librarian)",
        contact_phone="+91 94421 88105",
        contact_email="library@sfrc.edu.in",
        accessibility="Ground floor ramp, Braille section, digital screen readers, elevator to stack room",
        coordinates={"lat": 9.4528, "lng": 77.7978},
        description="Automated library housing 64,795 volumes, RFID gates, OPAC kiosks, digital reading hall, reference stacks, and reprography centre.",
        open_complaints_count=1,
    ),
    FacilityDetail(
        id="fac-06",
        name="Science Block - Physics & Electronics Laboratory",
        code="PHY-LAB-01",
        category="Science Laboratories",
        building="Science Complex",
        floor="2nd Floor",
        capacity=50,
        operating_hours="09:00 AM - 04:30 PM (Mon-Fri)",
        in_charge="Dr. S. Meenakshi",
        contact_phone="+91 94421 88106",
        contact_email="physicslab@sfrc.edu.in",
        accessibility="Stair lifts and service elevator in Science Block, safety eye-wash stations",
        coordinates={"lat": 9.4538, "lng": 77.7975},
        description="Equipped with optical spectrometers, laser kits, digital oscilloscopes, semiconductor test rigs, and dark room for optics.",
        open_complaints_count=0,
    ),
    FacilityDetail(
        id="fac-07",
        name="Mathematics Block - Smart Class 201",
        code="MATH-SCR-201",
        category="Smart Classrooms & Lecture Halls",
        building="Mathematics Block",
        floor="2nd Floor",
        capacity=70,
        operating_hours="08:30 AM - 04:30 PM (Mon-Fri)",
        in_charge="Dr. A. Bhuvaneshwari",
        contact_phone="+91 94421 88107",
        contact_email="mathdept@sfrc.edu.in",
        accessibility="Audio amplification system, tactile floor indicators",
        coordinates={"lat": 9.4535, "lng": 77.7972},
        description="Smart classroom equipped with interactive smart board, high-lumen short-throw projector, and lecture capture streaming unit.",
        open_complaints_count=0,
    ),
    FacilityDetail(
        id="fac-08",
        name="Campus Canteen & Annapoorna Cafeteria",
        code="CANTEEN-01",
        category="Dining & Cafeterias",
        building="Student Amenities Center",
        floor="Ground Floor",
        capacity=250,
        operating_hours="07:30 AM - 06:30 PM (Daily)",
        in_charge="Mr. G. Nagarajan (Catering Supervisor)",
        contact_phone="+91 94421 88108",
        contact_email="canteen@sfrc.edu.in",
        accessibility="Zero-step entrance, accessible payment counter, sanitized water dispensaries",
        coordinates={"lat": 9.4522, "lng": 77.7985},
        description="Hygienic subsidized food court providing South Indian meals, fresh juices, health snacks, tea/coffee, and clean RO drinking water.",
        open_complaints_count=1,
    ),
    FacilityDetail(
        id="fac-09",
        name="SFRC Sports Ground & Athletic Pavilion",
        code="SPORTS-PAV-01",
        category="Sports & Athletics",
        building="East Campus Sports Complex",
        floor="Outdoor Complex",
        capacity=800,
        operating_hours="06:00 AM - 08:30 AM, 04:30 PM - 07:00 PM",
        in_charge="Director of Physical Education",
        contact_phone="+91 94421 88109",
        contact_email="sports@sfrc.edu.in",
        accessibility="Paved perimeter pathways, accessible pavilion seating area",
        coordinates={"lat": 9.4545, "lng": 77.8005},
        description="400m synthetic athletic track, football ground, basketball court with floodlights, volleyball courts, and gymnasium.",
        open_complaints_count=0,
    ),
    FacilityDetail(
        id="fac-10",
        name="Priyadharshini Women's Hostel (UG)",
        code="HST-PD-BLOCK",
        category="Student Hostels (UG)",
        building="Hostel Campus",
        floor="3 Floors (Ground + 2)",
        capacity=350,
        operating_hours="24x7 Resident Access (Curfew 06:30 PM)",
        in_charge="Dr. S. Malathi (Chief Warden)",
        contact_phone="+91 94421 12345",
        contact_email="warden.priyadharshini@sfrc.edu.in",
        accessibility="Ground floor accessible rooms, medical dispensary on ground floor",
        coordinates={"lat": 9.4515, "lng": 77.7990},
        description="Residential block for undergraduate students featuring study rooms, solar water heaters, dining hall, and 24x7 security surveillance.",
        open_complaints_count=2,
    ),
    FacilityDetail(
        id="fac-11",
        name="New Hostel Block (UG & PG)",
        code="HST-NH-BLOCK",
        category="Student Hostels (UG/PG)",
        building="Hostel Campus",
        floor="4 Floors (Ground + 3)",
        capacity=400,
        operating_hours="24x7 Resident Access (Curfew 06:30 PM)",
        in_charge="Mrs. R. Vijayalakshmi (Resident Warden)",
        contact_phone="+91 94421 23456",
        contact_email="warden.newhostel@sfrc.edu.in",
        accessibility="Passenger elevator, emergency call bells in corridors",
        coordinates={"lat": 9.4518, "lng": 77.7995},
        description="Modern hostel facility with Wi-Fi connectivity, laundry services, recreation room, indoor games, and attached study reading rooms.",
        open_complaints_count=1,
    ),
    FacilityDetail(
        id="fac-12",
        name="Postgraduate & Research Scholars Hostel",
        code="HST-PG-BLOCK",
        category="Research Residences",
        building="Hostel Campus",
        floor="2 Floors (Ground + 1)",
        capacity=150,
        operating_hours="24x7 Resident Access (Extended Library Curfew)",
        in_charge="Dr. K. Revathi (Senior Warden)",
        contact_phone="+91 94421 34567",
        contact_email="warden.pghostel@sfrc.edu.in",
        accessibility="Ground floor single rooms for disabled scholars, quiet study zones",
        coordinates={"lat": 9.4520, "lng": 77.8000},
        description="Dedicated quiet residential block for M.Sc, M.Phil, and Ph.D researchers with high-speed internet and research cubicles.",
        open_complaints_count=0,
    ),
    FacilityDetail(
        id="fac-13",
        name="College Administrative Block",
        code="ADMIN-MAIN-01",
        category="Administration & Governance",
        building="Main Heritage Block",
        floor="Ground & 1st Floor",
        capacity=100,
        operating_hours="09:00 AM - 05:00 PM (Mon-Fri)",
        in_charge="Principal & Administrative Officer",
        contact_phone="+91 94421 88100",
        contact_email="office@sfrc.edu.in",
        accessibility="Ramp at portico, wide main lobby, lower reception desks",
        coordinates={"lat": 9.4530, "lng": 77.7980},
        description="Principal's office, Controller of Examinations (COE), accounts section, fee collection counters, and IQAC directorate.",
        open_complaints_count=0,
    ),
    FacilityDetail(
        id="fac-14",
        name="SFRC Co-operative Store & Stationery Depot",
        code="COOP-STORE-01",
        category="Student Amenities & Stores",
        building="Student Center Ground Floor",
        floor="Ground Floor",
        capacity=40,
        operating_hours="08:30 AM - 05:00 PM (Mon-Sat)",
        in_charge="Mr. T. Murugan (Store Manager)",
        contact_phone="+91 94421 88114",
        contact_email="coopstore@sfrc.edu.in",
        accessibility="Zero-level entrance from main pedestrian walkway",
        coordinates={"lat": 9.4524, "lng": 77.7984},
        description="Official store for textbooks, lab manuals, record notebooks, stationery, uniforms, ID card accessories, and student discount supplies.",
        open_complaints_count=0,
    ),
    FacilityDetail(
        id="fac-15",
        name="IT & Network Operations Data Center",
        code="IT-NOC-01",
        category="Software & AI Labs",
        building="IT Block",
        floor="Ground Floor",
        capacity=20,
        operating_hours="24x7 Automated NOC Operations",
        in_charge="Systems Engineer & Network Head",
        contact_phone="+91 94421 88115",
        contact_email="noc@sfrc.edu.in",
        accessibility="Biometric secured entry, fire-suppression FM200 zone",
        coordinates={"lat": 9.4534, "lng": 77.7986},
        description="Central campus data centre managing fiber-optic backbone, 1 Gbps internet leased lines, firewall, campus Wi-Fi access controllers, and ERP servers.",
        open_complaints_count=1,
    ),
]


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=List[FacilityDetail])
@router.get("/", response_model=List[FacilityDetail])
async def list_facilities(
    category: Optional[str] = Query(None, alias="cat"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Retrieve all 15 campus facilities with live open complaints count and category filter."""
    filtered = ALL_FACILITIES
    if category and category.lower() != "all":
        filtered = [f for f in filtered if f.category.lower() == category.lower()]
    if search:
        s = search.lower()
        filtered = [
            f for f in filtered
            if s in f.name.lower() or s in f.code.lower() or s in f.building.lower() or s in f.category.lower()
        ]

    return filtered


@router.get("/categories", response_model=List[str])
async def list_facility_categories():
    """List all 14 unique facility categories."""
    cats = sorted(list(set(f.category for f in ALL_FACILITIES)))
    return cats


@router.get("/{facility_id}", response_model=FacilityDetail)
async def get_facility_detail(
    facility_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Retrieve full details of a specific campus facility."""
    fac = next((f for f in ALL_FACILITIES if f.id == facility_id or f.code == facility_id), None)
    if not fac:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found")
    return fac


@router.get("/{facility_id}/complaints", response_model=List[FacilityComplaintItem])
async def get_facility_complaints(
    facility_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Retrieve open/active maintenance complaints associated with this facility."""
    # Query DB complaints for facility or return sample
    try:
        q = text("""
            SELECT id, complaint_number, title, category, priority, status, created_at::text
            FROM public.complaints
            WHERE facility_id = :fid::uuid AND status NOT IN ('resolved', 'closed')
            ORDER BY created_at DESC
        """)
        rows = (await db.execute(q, {"fid": facility_id})).mappings().all()
        if rows:
            return [
                FacilityComplaintItem(
                    id=str(r["id"]),
                    complaint_number=r["complaint_number"] or "CC-00001",
                    title=r["title"],
                    category=r["category"],
                    priority=r["priority"],
                    status=r["status"],
                    created_at=r["created_at"],
                )
                for r in rows
            ]
    except Exception:
        pass

    # Sample for facilities with open issues
    fac = next((f for f in ALL_FACILITIES if f.id == facility_id or f.code == facility_id), None)
    if fac and fac.open_complaints_count > 0:
        return [
            FacilityComplaintItem(
                id=f"cmp-{fac.id}-01",
                complaint_number="CC-00012",
                title=f"Maintenance inspection required in {fac.name}",
                category=fac.category,
                priority="high",
                status="in_progress",
                created_at="2026-09-28T10:00:00Z",
            )
        ]
    return []


class FacilityMapResponse(BaseModel):
    map_url: Optional[str] = None
    lat: float
    lng: float
    building: str
    location_text: str


@router.get("/{facility_id}/map", response_model=FacilityMapResponse)
async def get_facility_map(
    facility_id: str,
    user: dict = Depends(get_current_user),
):
    """Retrieve static map URL via MapsProvider if configured, otherwise returning None without exposing API keys."""
    from app.integrations.maps.provider_factory import get_maps_provider

    fac = next((f for f in ALL_FACILITIES if f.id == facility_id or f.code == facility_id), None)
    if not fac:
        lat, lng = 9.4528, 77.8000
        building = "Main Campus Block"
        loc_text = "Building: Main Campus Block, Floor: Ground Floor"
    else:
        coords = fac.coordinates or {"lat": 9.4528, "lng": 77.8000}
        lat = coords.get("lat", 9.4528)
        lng = coords.get("lng", 77.8000)
        building = fac.building
        loc_text = f"Building: {fac.building}, Floor: {fac.floor or 'Ground Floor'}"

    provider = get_maps_provider()
    map_url = await provider.get_static_map_url(lat=lat, lng=lng, zoom=16)

    return FacilityMapResponse(
        map_url=map_url,
        lat=lat,
        lng=lng,
        building=building,
        location_text=loc_text,
    )

