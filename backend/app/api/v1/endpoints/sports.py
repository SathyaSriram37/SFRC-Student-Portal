"""Sports & Athletics endpoints — College teams, tournaments, match results, achievements, and team membership."""
from __future__ import annotations

import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.capabilities import require_capability
from app.core.audit import log_audit_event

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class SportsTeamItem(BaseModel):
    id: str
    name: str
    sport: str
    category: str  # Outdoor | Indoor | Track & Field
    coach_name: str
    coach_phone: Optional[str] = None
    practice_schedule: str
    venue: str
    members_count: int
    captain_name: str
    is_joined: bool = False
    description: str


class SportsEventItem(BaseModel):
    id: str
    title: str
    sport: str
    tournament_name: str
    event_date: str
    time: str
    venue: str
    level: str  # Inter-Collegiate | District | State | National
    status: str  # upcoming | completed | ongoing
    opponent: Optional[str] = None
    result: Optional[str] = None
    score: Optional[str] = None
    is_registered: bool = False


class SportsAchievementItem(BaseModel):
    id: str
    title: str
    student_name: str
    register_number: str
    sport: str
    tournament: str
    level: str
    position: str  # Winner / Gold | Runner / Silver | 3rd Place / Bronze
    year: str
    certificate_url: Optional[str] = None


class SportsTeamCreate(BaseModel):
    name: str
    sport: str
    category: str
    coach_name: str
    coach_phone: Optional[str] = None
    practice_schedule: str
    venue: str
    captain_name: str
    description: str


# ── Seed 8 Sports Teams, Events & Achievements ────────────────────────────────

SEED_SPORTS_TEAMS: List[Dict[str, Any]] = [
    {
        "id": "team-01",
        "name": "SFRC Royal Strikers Cricket Team",
        "sport": "Cricket",
        "category": "Outdoor",
        "coach_name": "Dr. V. Muthuraman",
        "coach_phone": "+91 94431 22001",
        "practice_schedule": "Mon, Wed, Fri (06:00 AM - 07:45 AM)",
        "venue": "SFRC Main Cricket Oval Ground",
        "members_count": 18,
        "captain_name": "S. Preethi (III B.Sc CS)",
        "is_joined": True,
        "description": "University zone champions representing SFRC in autonomous collegiate tournaments.",
    },
    {
        "id": "team-02",
        "name": "SFRC Veera Thalaivigal Kabaddi Team",
        "sport": "Kabaddi",
        "category": "Outdoor",
        "coach_name": "Prof. S. Soundarapandian",
        "coach_phone": "+91 94431 22002",
        "practice_schedule": "Tue, Thu, Sat (04:30 PM - 06:00 PM)",
        "venue": "Outdoor Kabaddi Clay Court",
        "members_count": 14,
        "captain_name": "M. Kavitha (II B.A Tamil)",
        "is_joined": False,
        "description": "District division champions renowned for aggressive defense tactics.",
    },
    {
        "id": "team-03",
        "name": "SFRC Spikers Volleyball Team",
        "sport": "Volleyball",
        "category": "Outdoor",
        "coach_name": "Ms. R. Jeyalakshmi",
        "coach_phone": "+91 94431 22003",
        "practice_schedule": "Mon, Wed, Fri (04:30 PM - 06:15 PM)",
        "venue": "Main Volleyball Court",
        "members_count": 12,
        "captain_name": "A. Deepa (III B.Com CA)",
        "is_joined": False,
        "description": "State level qualifiers known for precision service and blocking.",
    },
    {
        "id": "team-04",
        "name": "SFRC Smashers Throwball Team",
        "sport": "Throwball",
        "category": "Outdoor",
        "coach_name": "Ms. K. Gomathi",
        "coach_phone": "+91 94431 22004",
        "practice_schedule": "Tue, Thu (06:15 AM - 07:45 AM)",
        "venue": "Sports Complex Court 2",
        "members_count": 14,
        "captain_name": "P. Nithya (II B.Sc Physics)",
        "is_joined": False,
        "description": "Regular finalists in the South Tamil Nadu Autonomous Tournament.",
    },
    {
        "id": "team-05",
        "name": "SFRC Shuttle Aces Badminton Team",
        "sport": "Badminton",
        "category": "Indoor",
        "coach_name": "Mr. C. Vignesh",
        "coach_phone": "+91 94431 22005",
        "practice_schedule": "Daily (06:00 AM - 07:30 AM & 04:30 PM - 06:00 PM)",
        "venue": "Indoor Badminton Wooden Stadium",
        "members_count": 10,
        "captain_name": "R. Hemalatha (I M.Sc Maths)",
        "is_joined": False,
        "description": "Singles and doubles team training on tournament grade synthetic mats.",
    },
    {
        "id": "team-06",
        "name": "SFRC Spin Wizards Table Tennis Team",
        "sport": "Table Tennis",
        "category": "Indoor",
        "coach_name": "Dr. M. Gurusamy",
        "coach_phone": "+91 94431 22006",
        "practice_schedule": "Mon, Wed, Fri (04:00 PM - 05:30 PM)",
        "venue": "Indoor Recreation Hall",
        "members_count": 8,
        "captain_name": "T. Divya (III B.Sc Chemistry)",
        "is_joined": False,
        "description": "High velocity offensive training with modern multi-table setups.",
    },
    {
        "id": "team-07",
        "name": "SFRC Grandmasters Chess Team",
        "sport": "Chess",
        "category": "Indoor",
        "coach_name": "Prof. T. Rajan",
        "coach_phone": "+91 94431 22007",
        "practice_schedule": "Tue, Thu, Sat (03:30 PM - 05:00 PM)",
        "venue": "Student Activity Center Room 102",
        "members_count": 12,
        "captain_name": "Karpagam S (III B.Sc CS)",
        "is_joined": True,
        "description": "FIDE rated squad participating in regional and collegiate rapid/classical events.",
    },
    {
        "id": "team-08",
        "name": "SFRC Lightning Track & Field Athletics",
        "sport": "Athletics",
        "category": "Track & Field",
        "coach_name": "Dr. K. Kalaiselvan (Physical Director)",
        "coach_phone": "+91 94431 22008",
        "practice_schedule": "Daily (06:00 AM - 08:00 AM)",
        "venue": "400m 8-Lane Standard Clay Track",
        "members_count": 25,
        "captain_name": "V. Banumathi (III B.A History)",
        "is_joined": False,
        "description": "Sprints, middle distance, relay, shotput, javelin, and long jump athletes.",
    },
]

SEED_SPORTS_EVENTS: List[Dict[str, Any]] = [
    {
        "id": "sp-ev-01",
        "title": "State Level Autonomous Inter-Collegiate Cricket Trophy",
        "sport": "Cricket",
        "tournament_name": "SFRC Trophy 2026",
        "event_date": "2026-10-18",
        "time": "09:00 AM",
        "venue": "SFRC Main Oval Ground",
        "level": "State",
        "status": "upcoming",
        "opponent": "Lady Doak College, Madurai",
        "result": None,
        "score": None,
        "is_registered": True,
    },
    {
        "id": "sp-ev-02",
        "title": "District Level Women's Kabaddi Championship",
        "sport": "Kabaddi",
        "tournament_name": "Virudhunagar District Trophy",
        "event_date": "2026-10-24",
        "time": "02:30 PM",
        "venue": "Kamaraj Indoor Stadium, Virudhunagar",
        "level": "District",
        "status": "upcoming",
        "opponent": "Ayya Nadar Janaki Ammal College",
        "result": None,
        "score": None,
        "is_registered": True,
    },
    {
        "id": "sp-ev-03",
        "title": "South Zone Inter-University Chess Championship",
        "sport": "Chess",
        "tournament_name": "MKU Zone Invitational",
        "event_date": "2026-11-04",
        "time": "10:00 AM",
        "venue": "Madurai Kamaraj University Campus",
        "level": "State",
        "status": "upcoming",
        "opponent": "Multiple Zonal Teams",
        "result": None,
        "score": None,
        "is_registered": True,
    },
    {
        "id": "sp-ev-04",
        "title": "Inter-Collegiate Volleyball Tournament Finals",
        "sport": "Volleyball",
        "tournament_name": "Sivakasi Rotary Shield 2026",
        "event_date": "2026-09-15",
        "time": "03:00 PM",
        "venue": "SFRC Volleyball Stadium",
        "level": "District",
        "status": "completed",
        "opponent": "Mepco Schlenk Engineering College",
        "result": "Won (Gold Medal)",
        "score": "25-21, 23-25, 25-18",
        "is_registered": False,
    },
    {
        "id": "sp-ev-05",
        "title": "State Level Shuttle Badminton Tournament",
        "sport": "Badminton",
        "tournament_name": "Chief Minister Trophy 2026",
        "event_date": "2026-08-20",
        "time": "11:00 AM",
        "venue": "SDAT Indoor Hall, Tirunelveli",
        "level": "State",
        "status": "completed",
        "opponent": "St. Xavier's College",
        "result": "Won (Gold in Doubles)",
        "score": "21-17, 21-19",
        "is_registered": False,
    },
    {
        "id": "sp-ev-06",
        "title": "Tamil Nadu Open Rapid Chess Championship",
        "sport": "Chess",
        "tournament_name": "TNSCA State Rapid 2026",
        "event_date": "2026-08-05",
        "time": "09:30 AM",
        "venue": "Chennai Trade Center",
        "level": "State",
        "status": "completed",
        "opponent": "State Grand Swiss",
        "result": "2nd Place (Silver)",
        "score": "7.5 / 9.0 Points",
        "is_registered": False,
    },
    {
        "id": "sp-ev-07",
        "title": "4x100m Women Relay Regional Finals",
        "sport": "Athletics",
        "tournament_name": "MKU Inter-Collegiate Athletic Meet",
        "event_date": "2026-07-28",
        "time": "08:30 AM",
        "venue": "Race Course Stadium, Madurai",
        "level": "State",
        "status": "completed",
        "opponent": "Fatima College, Madurai",
        "result": "Won (Gold Medal)",
        "score": "Time: 49.82s (Meet Record)",
        "is_registered": False,
    },
    {
        "id": "sp-ev-08",
        "title": "State Throwball Invitation Cup",
        "sport": "Throwball",
        "tournament_name": "Coimbatore Open 2026",
        "event_date": "2026-07-12",
        "time": "01:30 PM",
        "venue": "Nehru Stadium, Coimbatore",
        "level": "State",
        "status": "completed",
        "opponent": "PSG CAS, Coimbatore",
        "result": "3rd Place (Bronze)",
        "score": "15-12, 11-15, 15-13",
        "is_registered": False,
    },
]

SEED_SPORTS_ACHIEVEMENTS: List[Dict[str, Any]] = [
    {
        "id": "ach-01",
        "title": "Gold Medal - 4x100m Women Relay (New Meet Record)",
        "student_name": "V. Banumathi & Team",
        "register_number": "22UHI018",
        "sport": "Athletics",
        "tournament": "MKU Inter-Collegiate Athletic Championship",
        "level": "State Level",
        "position": "Winner (Gold Medal)",
        "year": "2026-2027",
        "certificate_url": "https://sfrcollege.edu.in/sports/certificates/relay-gold-2026.pdf",
    },
    {
        "id": "ach-02",
        "title": "Individual Silver Medal - State Rapid Chess Tournament",
        "student_name": "Karpagam S",
        "register_number": "22UCA042",
        "sport": "Chess",
        "tournament": "Tamil Nadu State Chess Association Championship",
        "level": "State Level",
        "position": "Runner Up (Silver Medal)",
        "year": "2026-2027",
        "certificate_url": "https://sfrcollege.edu.in/sports/certificates/chess-silver-2026.pdf",
    },
    {
        "id": "ach-03",
        "title": "Champions Trophy - Inter-Collegiate Volleyball League",
        "student_name": "A. Deepa & Team",
        "register_number": "22UCO031",
        "sport": "Volleyball",
        "tournament": "Sivakasi Rotary State Championship",
        "level": "District Level",
        "position": "Winner (Gold Trophy)",
        "year": "2026-2027",
        "certificate_url": "https://sfrcollege.edu.in/sports/certificates/volleyball-cup-2026.pdf",
    },
    {
        "id": "ach-04",
        "title": "Women's Doubles Gold Medal - State Badminton League",
        "student_name": "R. Hemalatha & S. Divya",
        "register_number": "22PMA005",
        "sport": "Badminton",
        "tournament": "Tamil Nadu CM Trophy Badminton 2026",
        "level": "State Level",
        "position": "Winner (Gold Medal)",
        "year": "2026-2027",
        "certificate_url": "https://sfrcollege.edu.in/sports/certificates/badminton-gold-2026.pdf",
    },
    {
        "id": "ach-05",
        "title": "Best Defender Award - District Kabaddi League",
        "student_name": "M. Kavitha",
        "register_number": "23UTA024",
        "sport": "Kabaddi",
        "tournament": "Virudhunagar District Women's Championship",
        "level": "District Level",
        "position": "Best Defender of the Tournament",
        "year": "2025-2026",
        "certificate_url": "https://sfrcollege.edu.in/sports/certificates/kabaddi-best-2025.pdf",
    },
]


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/sports/teams", response_model=List[SportsTeamItem])
async def list_sports_teams(
    user: dict = Depends(get_current_user),
):
    """Retrieve all 8 active college athletic teams."""
    return [SportsTeamItem(**t) for t in SEED_SPORTS_TEAMS]


@router.get("/sports/teams/{id}", response_model=SportsTeamItem)
async def get_sports_team_detail(
    id: str,
    user: dict = Depends(get_current_user),
):
    """Retrieve detailed sports team profile."""
    team = next((t for t in SEED_SPORTS_TEAMS if t["id"] == id or t["sport"].lower() == id.lower()), None)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sports team not found.")
    return SportsTeamItem(**team)


@router.post("/sports/teams/{id}/join", response_model=SportsTeamItem)
async def toggle_join_team(
    id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Join or leave a sports team squad."""
    team = next((t for t in SEED_SPORTS_TEAMS if t["id"] == id), None)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sports team not found.")

    team["is_joined"] = not team.get("is_joined", False)
    if team["is_joined"]:
        team["members_count"] += 1
    else:
        team["members_count"] = max(1, team["members_count"] - 1)

    await log_audit_event(
        user_id=user.get("id"),
        action="join_sports_team" if team["is_joined"] else "leave_sports_team",
        resource_type="sports_team",
        resource_id=id,
        details={"team_name": team["name"], "is_joined": team["is_joined"]},
        db=db,
    )

    return SportsTeamItem(**team)


@router.get("/sports/events", response_model=List[SportsEventItem])
async def list_sports_events(
    user: dict = Depends(get_current_user),
):
    """Retrieve upcoming and past collegiate tournaments and matches."""
    return [SportsEventItem(**e) for e in SEED_SPORTS_EVENTS]


@router.get("/sports/achievements", response_model=List[SportsAchievementItem])
async def list_sports_achievements(
    user: dict = Depends(get_current_user),
):
    """Retrieve sports wall of fame and state/district tournament medals."""
    return [SportsAchievementItem(**a) for a in SEED_SPORTS_ACHIEVEMENTS]


@router.post("/admin/sports/teams", response_model=SportsTeamItem, status_code=status.HTTP_201_CREATED)
async def create_sports_team(
    body: SportsTeamCreate,
    user: dict = Depends(require_capability("manage_sports")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new varsity athletic squad."""
    new_team = {
        "id": f"team-{uuid.uuid4().hex[:8]}",
        "name": body.name,
        "sport": body.sport,
        "category": body.category,
        "coach_name": body.coach_name,
        "coach_phone": body.coach_phone,
        "practice_schedule": body.practice_schedule,
        "venue": body.venue,
        "members_count": 1,
        "captain_name": body.captain_name,
        "is_joined": False,
        "description": body.description,
    }
    SEED_SPORTS_TEAMS.append(new_team)

    await log_audit_event(
        user_id=user.get("id"),
        action="create_sports_team",
        resource_type="sports_team",
        resource_id=new_team["id"],
        details={"name": body.name, "sport": body.sport},
        db=db,
    )

    return SportsTeamItem(**new_team)
