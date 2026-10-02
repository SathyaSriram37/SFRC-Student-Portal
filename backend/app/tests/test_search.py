"""
Phase 19 — Global Search API Tests.
Tests the role-aware search endpoint across events, courses, e-content, facilities, policies, and alumni.
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
        r = await client.get("/api/v1/search?q=library&types=facilities,policies", headers=auth("student"))
    assert r.status_code == 200
    data = r.json()
    assert data["query"] == "library"
    assert isinstance(data["results"], list)
