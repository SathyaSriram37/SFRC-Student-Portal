"""Campus Care AI Classification & SLA Engine."""
from __future__ import annotations

from typing import Any, Dict, Optional
from datetime import datetime, timezone

SLA_HOURS: Dict[str, float] = {
    "critical": 0.5,  # 30 mins
    "high": 2.0,      # 2 hours
    "medium": 8.0,    # 8 hours
    "low": 24.0,      # 24 hours
}

WARN_HOURS: Dict[str, float] = {
    "critical": 0.25, # 15 mins
    "high": 1.0,      # 1 hour
    "medium": 6.0,    # 6 hours
    "low": 20.0,      # 20 hours
}


def classify_complaint(
    title: str,
    description: str,
    location: Optional[str] = None,
) -> Dict[str, Any]:
    """AI classification and priority recommendation for civic/facility complaints."""
    text = f"{title} {description} {location or ''}".lower()

    if any(w in text for w in ["projector", "lcd", "display", "hdmi", "screen", "audio", "mic", "speaker"]):
        cat, pri = "Computer/Projector", "high"
    elif any(w in text for w in ["wifi", "network", "internet", "lan", "router", "portal", "login issue"]):
        cat, pri = "IT/Network", "high"
    elif any(w in text for w in ["electric", "light", "fan", "power", "socket", "switch", "ac", "air condition"]):
        cat, pri = "Electrical", "high"
    elif any(w in text for w in ["water", "leak", "pipe", "tap", "drainage", "washroom", "toilet", "flush", "plumb"]):
        cat, pri = "Water/Plumbing", "medium"
    elif any(w in text for w in ["chair", "table", "furniture", "desk", "bench", "podium", "door", "window", "lock"]):
        cat, pri = "Furniture", "low"
    elif any(w in text for w in ["clean", "dirty", "garbage", "dust", "trash", "spill", "sanitation", "pest"]):
        cat, pri = "Cleanliness", "low"
    elif any(w in text for w in ["hostel", "mess", "food", "bed", "curfew", "warden"]):
        cat, pri = "Hostel/Mess", "medium"
    else:
        cat, pri = "Other", "medium"

    # Critical override for safety hazards
    if any(w in text for w in ["fire", "smoke", "sparks", "burning", "short circuit", "gas leak", "hazard", "electric shock"]):
        pri = "critical"
        cat = "Emergency/Safety"

    return {
        "ai_category": cat,
        "ai_summary": f"Reported issue: {title[:80]}",
        "ai_confidence": 0.85 if pri == "critical" else 0.78,
        "suggested_priority": pri,
        "sla_target_hours": SLA_HOURS.get(pri, 8.0),
    }


def calculate_sla_status(
    created_at: datetime,
    priority: str,
    resolved_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Compute real-time SLA metrics, remaining time, and SLA status (ok, warning, overdue, resolved_in_sla, breached)."""
    pri = priority.lower() if priority else "medium"
    sla_limit = SLA_HOURS.get(pri, 8.0)
    warn_limit = WARN_HOURS.get(pri, 6.0)

    # Ensure UTC timezone
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_dt = created_at.replace(tzinfo=timezone.utc)
    else:
        created_dt = created_at

    if resolved_at:
        if resolved_at.tzinfo is None:
            resolved_dt = resolved_at.replace(tzinfo=timezone.utc)
        else:
            resolved_dt = resolved_at
        elapsed_hours = (resolved_dt - created_dt).total_seconds() / 3600.0
        is_breached = elapsed_hours > sla_limit
        return {
            "status": "resolved_breached" if is_breached else "resolved_in_sla",
            "elapsed_hours": round(elapsed_hours, 2),
            "sla_limit_hours": sla_limit,
            "remaining_hours": 0.0,
            "is_breached": is_breached,
        }

    elapsed_hours = max(0.0, (now - created_dt).total_seconds() / 3600.0)
    remaining_hours = max(0.0, sla_limit - elapsed_hours)

    if elapsed_hours > sla_limit:
        sla_state = "overdue"
    elif elapsed_hours > warn_limit:
        sla_state = "warning"
    else:
        sla_state = "ok"

    return {
        "status": sla_state,
        "elapsed_hours": round(elapsed_hours, 2),
        "sla_limit_hours": sla_limit,
        "remaining_hours": round(remaining_hours, 2),
        "is_breached": (elapsed_hours > sla_limit),
    }
