"""Maps Provider Factory."""
from __future__ import annotations
import os
from app.core.config import settings
from app.integrations.maps.adapter import MapsProvider
from app.integrations.maps.google_maps import GoogleMapsProvider
from app.integrations.maps.fallback import NoMapsProvider


def get_maps_provider() -> MapsProvider:
    """Return GoogleMapsProvider if API key is set, else NoMapsProvider."""
    key = (settings.google_maps_api_key or os.getenv("GOOGLE_MAPS_API_KEY", "")).strip()
    if key:
        return GoogleMapsProvider(api_key=key)
    return NoMapsProvider()
