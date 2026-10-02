import pytest
from app.ai.pragya_service import PragyaService, MAIN_BUTTONS, DEPARTMENTS_DATA, FACULTY_DATA, FEES_DATA, GUIDES_DATA, TRANSPORT_DATA, CONTACT_DATA
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_pragya_greeting():
    user = {"id": "test-user-1", "role": "student", "name": "Deepa K", "register_number": "22UCA042"}
    res = await PragyaService.process_chat("Hello", user=user)
    assert res is not None
    assert "Pragya" in res["reply"]
    assert res["buttons"] == MAIN_BUTTONS
    assert res["intent"] == "greeting"


@pytest.mark.asyncio
async def test_pragya_departments():
    user = {"id": "test-user-1", "role": "student", "name": "Deepa K", "register_number": "22UCA042"}
    res = await PragyaService.process_chat("departments", user=user)
    assert "choose department category" in res["reply"]
    assert "Aided" in res["buttons"]
    assert "Self" in res["buttons"]


@pytest.mark.asyncio
async def test_pragya_aided_departments():
    user = {"id": "test-user-1", "role": "student", "name": "Deepa K", "register_number": "22UCA042"}
    res = await PragyaService.process_chat("aided", user=user)
    assert "Available Aided departments" in res["reply"]
    assert "Department of Tamil" in res["reply"]
    assert "Menu" in res["buttons"]


@pytest.mark.asyncio
async def test_pragya_fees_inquiry():
    user = {"id": "test-user-1", "role": "student", "name": "Deepa K", "register_number": "22UCA042"}
    res = await PragyaService.process_chat("What is the fee for Data Science?", user=user)
    assert "Department of Data Science" in res["reply"]
    assert "₹19,000" in res["reply"]
    assert res["intent"] == "fees"


@pytest.mark.asyncio
async def test_pragya_faculty_inquiry():
    user = {"id": "test-user-1", "role": "student", "name": "Deepa K", "register_number": "22UCA042"}
    res = await PragyaService.process_chat("Who is Dr.B.Ponni?", user=user)
    assert "Dr.B.Ponni" in res["reply"]
    assert "Tamil" in res["reply"]
    assert res["intent"] == "faculty"


@pytest.mark.asyncio
async def test_pragya_transport_route():
    user = {"id": "test-user-1", "role": "student", "name": "Deepa K", "register_number": "22UCA042"}
    res = await PragyaService.process_chat("Show bus details for Route 1", user=user)
    assert "SFRC-01" in res["reply"]
    assert "Thiruthangal" in res["reply"]
    assert res["intent"] == "transport"


@pytest.mark.asyncio
async def test_pragya_contact():
    user = {"id": "test-user-1", "role": "student", "name": "Deepa K", "register_number": "22UCA042"}
    res = await PragyaService.process_chat("contact details", user=user)
    assert "Admission Office" in res["reply"]
    assert "+91 4562 220389" in res["reply"]
    assert res["intent"] == "contact"


@pytest.mark.asyncio
async def test_pragya_student_isolation_security():
    # Student attempting to query another student's register number directly
    user = {"id": "test-user-1", "role": "student", "name": "Deepa K", "register_number": "22UCA042"}
    with pytest.raises(HTTPException) as exc_info:
        await PragyaService.process_chat("Show attendance for 22UCA099", user=user)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_pragya_student_own_tools():
    user = {"id": "test-user-1", "role": "student", "name": "Deepa K", "register_number": "22UCA042"}
    res = await PragyaService.process_chat("my attendance", user=user)
    assert "Attendance Record" in res["reply"]
    assert "88.5%" in res["reply"]
    assert res["intent"] == "attendance"
