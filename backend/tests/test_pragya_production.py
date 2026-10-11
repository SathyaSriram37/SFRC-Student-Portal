import pytest
from app.ai.pragya_service import PragyaService, MAIN_BUTTONS
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_pragya_knowledge_cia_scheme():
    user = {"id": "test-user-1", "role": "student", "name": "Deepa K", "register_number": "22UCA042"}
    res = await PragyaService.process_chat("How are CIA internal marks calculated?", user=user)
    assert res is not None
    assert "Continuous Internal Assessment" in res["reply"] or "CIA" in res["reply"]
    assert "25" in res["reply"] or "40" in res["reply"]


@pytest.mark.asyncio
async def test_pragya_knowledge_attendance_rule():
    user = {"id": "test-user-1", "role": "student", "name": "Deepa K", "register_number": "22UCA042"}
    res = await PragyaService.process_chat("What happens if attendance is below 75%?", user=user)
    assert res is not None
    assert "75%" in res["reply"] or "Condonation" in res["reply"]


@pytest.mark.asyncio
async def test_pragya_knowledge_pudhumai_penn_scholarship():
    user = {"id": "test-user-1", "role": "student", "name": "Deepa K", "register_number": "22UCA042"}
    res = await PragyaService.process_chat("What is Pudhumai Penn scholarship?", user=user)
    assert res is not None
    assert "1,000" in res["reply"] or "Pudhumai Penn" in res["reply"]


@pytest.mark.asyncio
async def test_pragya_knowledge_acide_startups():
    user = {"id": "test-user-1", "role": "student", "name": "Deepa K", "register_number": "22UCA042"}
    res = await PragyaService.process_chat("Show ACIDE student startups", user=user)
    assert res is not None
    assert "Kissan Innova" in res["reply"] or "ACIDE" in res["reply"]


@pytest.mark.asyncio
async def test_pragya_tanglish_queries():
    user = {"id": "test-user-1", "role": "student", "name": "Deepa K", "register_number": "22UCA042"}
    # Tanglish attendance
    res_att = await PragyaService.process_chat("my attendance evlo", user=user)
    assert "Attendance Record" in res_att["reply"]

    # Tanglish bus timing
    res_bus = await PragyaService.process_chat("bus route 1 timing sollu", user=user)
    assert "SFRC-01" in res_bus["reply"] or "Thiruthangal" in res_bus["reply"]


@pytest.mark.asyncio
async def test_pragya_multiturn_complaint_flow():
    user = {"id": "test-user-1", "role": "student", "name": "Deepa K", "email": "deepa@sfrcollege.edu.in", "register_number": "22UCA042"}
    
    # Step 1: Trigger complaint
    res1 = await PragyaService.process_chat("I want to report a broken projector", user=user)
    conv_id = res1["conversation_id"]
    assert res1["intent"] == "complaint"
    assert "Describe briefly" in res1["reply"]

    # Step 2: Provide details
    res2 = await PragyaService.process_chat("Broken projector in Room 104 MCA Block", user=user, conversation_id=conv_id)
    assert "Filing:" in res2["reply"]
    assert "Proceed?" in res2["reply"]

    # Step 3: Confirm complaint
    res3 = await PragyaService.process_chat("yes proceed", user=user, conversation_id=conv_id)
    assert "created" in res3["reply"].lower() or "ticket" in res3["reply"].lower() or "cc-" in res3["reply"].lower()
