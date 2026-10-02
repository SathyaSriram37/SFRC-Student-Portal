"""
Abstract base adapter for SFRC ERMS (Examination & Results Management System) integration.

IMPORTANT: MyZone SFRC 360 is NOT an ERMS replacement. It is an experience + AI layer.
Real integration requires an authorized API from SFRC IT. Currently uses MockERMSAdapter
with MyZone's own PostgreSQL database for demonstration purposes.
"""
from __future__ import annotations
from abc import ABC, abstractmethod


class ERMSAdapter(ABC):
    """
    Abstract interface for SFRC ERMS integration.
    Real implementation requires an authorized API access from SFRC IT department.
    """

    @abstractmethod
    async def get_student_profile(self, register_number: str) -> dict:
        """Fetch a student's profile record from ERMS."""
        ...

    @abstractmethod
    async def get_attendance(self, register_number: str, semester: int) -> dict:
        """Fetch attendance records for a student from ERMS."""
        ...

    @abstractmethod
    async def get_marks(self, register_number: str, semester: int) -> dict:
        """Fetch internal/external marks for a student from ERMS."""
        ...

    @abstractmethod
    async def get_timetable(self, programme_id: str, semester: int) -> dict:
        """Fetch class timetable for a programme and semester from ERMS."""
        ...

    @abstractmethod
    async def health_check(self) -> dict:
        """Return health status and adapter mode information."""
        ...
