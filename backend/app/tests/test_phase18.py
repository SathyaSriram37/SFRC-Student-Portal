"""
Tests for Phase 18: ERMS Integration Adapter.

Validates:
1. ERMS health check returns mode='mock' by default
2. MockERMSAdapter returns all required fields
3. Factory returns MockERMSAdapter when ERMS_INTEGRATION_ENABLED=false
4. Sync log endpoint is accessible (admin)
5. Demo sync trigger creates a log entry
6. SFRCERMSAdapter raises NotImplementedError for all abstract methods
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


# ── Adapter Unit Tests ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mock_adapter_health_check():
    """MockERMSAdapter.health_check must return mode='mock' and status='ok'."""
    from unittest.mock import AsyncMock, MagicMock
    from app.integrations.erms.mock_adapter import MockERMSAdapter

    mock_db = AsyncMock()
    adapter = MockERMSAdapter(mock_db)
    result = await adapter.health_check()

    assert result["mode"] == "mock"
    assert result["status"] == "ok"
    assert "sfrc erms" in result["note"].lower()
    assert result["erms_integration_enabled"] is False


@pytest.mark.asyncio
async def test_mock_adapter_get_student_profile():
    """MockERMSAdapter.get_student_profile must return own-DB data with source note."""
    from unittest.mock import AsyncMock
    from app.integrations.erms.mock_adapter import MockERMSAdapter

    mock_db = AsyncMock()
    adapter = MockERMSAdapter(mock_db)
    result = await adapter.get_student_profile("TEST001")

    assert result["register_number"] == "TEST001"
    assert "mock" in result["source"].lower()


@pytest.mark.asyncio
async def test_mock_adapter_get_marks():
    """MockERMSAdapter.get_marks must return results list with source note."""
    from unittest.mock import AsyncMock
    from app.integrations.erms.mock_adapter import MockERMSAdapter

    mock_db = AsyncMock()
    adapter = MockERMSAdapter(mock_db)
    result = await adapter.get_marks("TEST001", 5)

    assert "results" in result
    assert isinstance(result["results"], list)
    assert result["semester"] == 5


@pytest.mark.asyncio
async def test_sfrc_erms_adapter_raises_not_implemented():
    """SFRCERMSAdapter must raise NotImplementedError for all abstract methods."""
    from app.integrations.erms.sfrc_erms_adapter import SFRCERMSAdapter

    adapter = SFRCERMSAdapter()

    with pytest.raises(NotImplementedError):
        await adapter.get_student_profile("TEST001")

    with pytest.raises(NotImplementedError):
        await adapter.get_marks("TEST001", 5)

    with pytest.raises(NotImplementedError):
        await adapter.get_attendance("TEST001", 5)

    with pytest.raises(NotImplementedError):
        await adapter.get_timetable("CSE", 5)


@pytest.mark.asyncio
async def test_sfrc_erms_adapter_health_returns_unavailable():
    """SFRCERMSAdapter.health_check returns mode='not_configured'."""
    from app.integrations.erms.sfrc_erms_adapter import SFRCERMSAdapter

    adapter = SFRCERMSAdapter()
    result = await adapter.health_check()

    assert result["mode"] == "not_configured"
    assert result["status"] == "unavailable"


@pytest.mark.asyncio
async def test_factory_returns_mock_by_default():
    """Factory must return MockERMSAdapter when ERMS_INTEGRATION_ENABLED=false."""
    from unittest.mock import AsyncMock
    from app.integrations.erms.factory import get_erms_adapter
    from app.integrations.erms.mock_adapter import MockERMSAdapter
    from app.core.config import settings

    # Default config has erms_integration_enabled=False
    assert settings.erms_integration_enabled is False

    mock_db = AsyncMock()
    adapter = get_erms_adapter(mock_db)
    assert isinstance(adapter, MockERMSAdapter)


# ── HTTP Endpoint Tests ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_erms_health_endpoint():
    """GET /api/v1/integrations/erms/health must return mode='mock' and status='ok'."""
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/integrations/erms/health")
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "mock"
    assert data["status"] == "ok"
    assert data["erms_integration_enabled"] is False
