"""Google Maps API provider and adapter."""
from __future__ import annotations

import httpx
from typing import Optional, Dict
from app.core.config import settings
from app.integrations.maps.adapter import MapsProvider, MapsAdapter

GMAPS_BASE = "https://maps.googleapis.com/maps/api"


class GoogleMapsProvider(MapsProvider):
    def __init__(self, api_key: Optional[str] = None):
        self._key = api_key or settings.google_maps_api_key

    async def get_static_map_url(self, lat: float, lng: float, zoom: int = 15) -> Optional[str]:
        if not self._key:
            return None
        return f"https://maps.googleapis.com/maps/api/staticmap?center={lat},{lng}&zoom={zoom}&size=400x300&markers={lat},{lng}&key={self._key}"


class GoogleMapsAdapter(MapsAdapter):
    def __init__(self):
        self._key = settings.google_maps_api_key

    async def geocode(self, address: str) -> dict:
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{GMAPS_BASE}/geocode/json", params={"address": address, "key": self._key})
        data = r.json()
        if data.get("results"):
            loc = data["results"][0]["geometry"]["location"]
            return {"lat": loc["lat"], "lng": loc["lng"], "formatted_address": data["results"][0]["formatted_address"]}
        return {}

    async def reverse_geocode(self, lat: float, lng: float) -> str:
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{GMAPS_BASE}/geocode/json", params={"latlng": f"{lat},{lng}", "key": self._key})
        data = r.json()
        if data.get("results"):
            return data["results"][0]["formatted_address"]
        return ""

    async def get_distance(self, origin: str, destination: str) -> dict:
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{GMAPS_BASE}/distancematrix/json",
                params={"origins": origin, "destinations": destination, "key": self._key})
        data = r.json()
        try:
            element = data["rows"][0]["elements"][0]
            return {"distance": element["distance"]["text"], "duration": element["duration"]["text"]}
        except (KeyError, IndexError):
            return {}
