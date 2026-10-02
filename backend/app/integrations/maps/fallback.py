"""Fallback Maps provider and adapter when no API key is configured."""
from __future__ import annotations
from typing import Optional
from app.integrations.maps.adapter import MapsProvider, MapsAdapter


class NoMapsProvider(MapsProvider):
    """Graceful provider returning None when GOOGLE_MAPS_API_KEY is not set."""

    async def get_static_map_url(self, lat: float, lng: float, zoom: int = 15) -> Optional[str]:
        return None


class FallbackMapsAdapter(MapsAdapter):
    """Used when GOOGLE_MAPS_API_KEY is not set."""

    SFRC_LOCATION = {"lat": 9.4528, "lng": 77.8000, "formatted_address": "Sivakasi, Tamil Nadu, India"}

    async def geocode(self, address: str) -> dict:
        return self.SFRC_LOCATION

    async def reverse_geocode(self, lat: float, lng: float) -> str:
        return "Sivakasi, Tamil Nadu, India"

    async def get_distance(self, origin: str, destination: str) -> dict:
        return {"distance": "N/A", "duration": "N/A"}
