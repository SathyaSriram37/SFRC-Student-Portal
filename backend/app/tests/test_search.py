"""
Phase 19 — Global Enterprise Search API Tests.
Tests the role-aware search endpoint across quick navigation, library catalog, events, courses,
e-content, facilities, policies, alumni, startups, transport routes, and typo tolerance.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.tests.test_security import auth


@pytest.mark.asyncio
async def test_search_unauthenticated_returns_401():
    """Unauthenticated search must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/search?q=computer")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_search_validation_min_length():
    """Search query with less than 2 characters must fail with 422."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/search?q=a", headers=auth("student"))
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_search_student_returns_200():
    """Student search query returns 200 with standard response structure."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/search?q=campus", headers=auth("student"))
    assert r.status_code == 200
    data = r.json()
    assert "query" in data
    assert data["query"] == "campus"
    assert "results" in data
    assert isinstance(data["results"], list)
    assert "total" in data
    assert "took_ms" in data


@pytest.mark.asyncio
async def test_search_with_type_filter():
    """Search with specific types parameter returns 200."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/search?q=library&types=facilities,policies,navigation", headers=auth("student"))
    assert r.status_code == 200
    data = r.json()
    assert data["query"] == "library"
    assert isinstance(data["results"], list)
    assert len(data["results"]) >= 1


@pytest.mark.asyncio
async def test_search_navigation_direct_actions():
    """Search for 'attendance', 'marks', 'fees', 'hostel' returns quick navigation actions."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/search?q=attendance", headers=auth("student"))
        assert r.status_code == 200
        data = r.json()
        assert any(item["type"] == "navigation" and "/student/attendance" in item["href"] for item in data["results"])

        r_marks = await client.get("/api/v1/search?q=cia marks", headers=auth("student"))
        assert r_marks.status_code == 200
        data_marks = r_marks.json()
        assert any("marks" in item["title"].lower() or "cia" in item["title"].lower() for item in data_marks["results"])


@pytest.mark.asyncio
async def test_search_library_and_transport():
    """Search for library books and transport routes returns rich persistent records."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Transport search
        r_trans = await client.get("/api/v1/search?q=bus route", headers=auth("student"))
        assert r_trans.status_code == 200
        data_trans = r_trans.json()
        assert len(data_trans["results"]) >= 1
        assert any(item["type"] in ["transport", "navigation"] for item in data_trans["results"])

        # Specific stop search
        r_stop = await client.get("/api/v1/search?q=Thiruthangal", headers=auth("student"))
        assert r_stop.status_code == 200
        data_stop = r_stop.json()
        assert any("Thiruthangal" in item["title"] or "Thiruthangal" in (item["subtitle"] or "") for item in data_stop["results"])


@pytest.mark.asyncio
async def test_search_typo_tolerance():
    """Search with typo 'atendance' or 'phsyics' or 'libary' successfully resolves via fuzzy matching."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Typo: 'atendance' -> Attendance
        r = await client.get("/api/v1/search?q=atendance", headers=auth("student"))
        assert r.status_code == 200
        data = r.json()
        assert len(data["results"]) >= 1
        assert any("attendance" in item["title"].lower() for item in data["results"])

        # Typo: 'libary' -> Library
        r_lib = await client.get("/api/v1/search?q=libary", headers=auth("student"))
        assert r_lib.status_code == 200
        data_lib = r_lib.json()
        assert len(data_lib["results"]) >= 1
        assert any("library" in item["title"].lower() for item in data_lib["results"])


@pytest.mark.asyncio
async def test_search_startups_and_policies():
    """Search for 'Kissan Innova' or 'Anti-Ragging' returns exact entity records."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r_startup = await client.get("/api/v1/search?q=Kissan Innova", headers=auth("student"))
        assert r_startup.status_code == 200
        data_startup = r_startup.json()
        assert any("Kissan Innova" in item["title"] for item in data_startup["results"])

        r_policy = await client.get("/api/v1/search?q=anti-ragging", headers=auth("student"))
        assert r_policy.status_code == 200
        data_policy = r_policy.json()
        assert any("Anti-Ragging" in item["title"] for item in data_policy["results"])
