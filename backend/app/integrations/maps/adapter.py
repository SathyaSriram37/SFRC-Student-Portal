"""Abstract base class for Maps providers and legacy adapters."""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional, Dict


class MapsProvider(ABC):
    @abstractmethod
    async def get_static_map_url(self, lat: float, lng: float, zoom: int = 15) -> Optional[str]:
        """Generate static map URL if API key configured, else None."""
        ...


class MapsAdapter(ABC):
    @abstractmethod
    async def geocode(self, address: str) -> dict:
        ...

    @abstractmethod
    async def reverse_geocode(self, lat: float, lng: float) -> str:
        ...

    @abstractmethod
    async def get_distance(self, origin: str, destination: str) -> dict:
        ...
