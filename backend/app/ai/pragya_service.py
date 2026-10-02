"""Pragya AI Service — Intent routing, database tool execution, multi-turn complaint flow, RAG retrieval & LLM response generation with full SFRC_Assist knowledge integration."""
from __future__ import annotations

import re
import uuid
from difflib import get_close_matches
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import HTTPException, status

from app.ai.providers.provider_factory import get_llm_provider, get_embedding_provider
from app.rag.retrieval import retrieve
from app.core.audit import log_audit_event


COMPLAINTS_REGISTRY: List[Dict[str, Any]] = []

# In-Memory + DB synchronized conversations & message history
AI_CONVERSATIONS: List[Dict[str, Any]] = [
    {
        "id": "conv-default-01",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "title": "Welcome to Pragya AI",
        "metadata": {},
        "created_at": "2026-09-28T09:00:00Z",
        "updated_at": "2026-09-28T09:05:00Z",
    }
]

AI_MESSAGES: List[Dict[str, Any]] = []

# ── SFRC Assist Institutional Knowledge Store ────────────────────────────────

MAIN_BUTTONS = ["Admissions", "Departments", "Fees", "Faculty", "PhD Guides", "Transport", "Contact"]

DEPARTMENTS_DATA = [
    # UG Aided
    {"id": 1, "level": "UG", "category": "Aided", "department_name": "Department of Tamil", "hod": "Dr. B. Ponni M.A., M.Phil., Ph.D., C.G.T., Dip.in.M.S.Off.,", "description": "Duration: 3 years"},
    {"id": 2, "level": "UG", "category": "Aided", "department_name": "Department of English", "hod": "Dr. K. Muthamil Selvi MA., M.Phil., B.Ed., Ph.D.", "description": "Duration: 3 years"},
    {"id": 3, "level": "UG", "category": "Aided", "department_name": "Department of Mathematics", "hod": "Head of Department", "description": "Department of Mathematics"},
    {"id": 4, "level": "UG", "category": "Aided", "department_name": "Department of Physics", "hod": "Dr. S. Jayanthi M.Sc., Ph.D", "description": "Duration: 3 years"},
    {"id": 5, "level": "UG", "category": "Aided", "department_name": "Department of Chemistry", "hod": "Dr. M. Murugalakshmi M.Sc., M.Phil., Ph.D", "description": "Duration: 3 years"},
    {"id": 6, "level": "UG", "category": "Aided", "department_name": "Department of Botany", "hod": "Dr.(Mrs). B. Deepa M.Sc., M.Phil., Ph.D.", "description": "Duration: 3 years"},
    # UG Self-Finance
    {"id": 7, "level": "UG", "category": "Self-Finance", "department_name": "Department of Computer Science", "hod": "Mrs. P. Prescilla MCA, M.Phil", "description": "Duration: 3 years"},
    {"id": 8, "level": "UG", "category": "Self-Finance", "department_name": "Department of Data Science", "hod": "Mrs. D. Gangadevi, MCA., M.Phil., SET., NET.,", "description": "Duration: 3 years"},
    {"id": 9, "level": "UG", "category": "Self", "department_name": "Department of Computer Applications", "hod": "Head of Department", "description": "Department of Computer Applications"},
    {"id": 10, "level": "UG", "category": "Self", "department_name": "Department of Commerce", "hod": "Head of Department", "description": "Department of Commerce"},
    {"id": 11, "level": "UG", "category": "Self", "department_name": "Department of Commerce CA", "hod": "Head of Department", "description": "Department of Commerce Computer Applications"},
    # PG
    {"id": 12, "level": "PG", "category": "Self", "department_name": "Department of M.Sc Computer Science", "hod": "Head of Department", "description": "Post Graduate Computer Science"},
    {"id": 13, "level": "PG", "category": "Self", "department_name": "Department of M.Sc Data Science", "hod": "Head of Department", "description": "Post Graduate Data Science"},
    {"id": 14, "level": "PG", "category": "Self", "department_name": "Department of M.Com", "hod": "Head of Department", "description": "Post Graduate Commerce"},
    # PhD
    {"id": 15, "level": "Ph.D", "category": "Research", "department_name": "Department of Tamil (Ph.D)", "hod": "Research Coordinator", "description": "Ph.D Research Programme"},
    {"id": 16, "level": "Ph.D", "category": "Research", "department_name": "Department of Commerce (Ph.D)", "hod": "Research Coordinator", "description": "Ph.D Research Programme"},
    {"id": 17, "level": "Ph.D", "category": "Research", "department_name": "Department of Computer Science (Ph.D)", "hod": "Research Coordinator", "description": "Ph.D Research Programme"},
]

FACULTY_DATA = [
    {"id": 1, "department": "Tamil", "faculty_name": "Dr.B.Ponni", "designation": "Associate Professor & Head", "qualification": "M.A.,M.Phil.,Ph.D", "email": "ponni-tam@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Tamil"},
    {"id": 2, "department": "Botany", "faculty_name": "Dr.(Mrs.)B.Deepa", "designation": "Associate Professor & Head", "qualification": "M.Sc.,M.Phil.,Ph.D", "email": "deepa-bot@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Botany"},
    {"id": 3, "department": "Commerce", "faculty_name": "Dr.V.Meenakshi", "designation": "Assistant Professor & Head", "qualification": "M.Com.,M.Phil.", "email": "meenakshi-com@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Assistant Professor & Head of Commerce"},
    {"id": 4, "department": "English", "faculty_name": "Dr. K. Muthamil Selvi", "designation": "Associate Professor & Head", "qualification": "MA., M.Phil., B.Ed., Ph.D.", "email": "muthamil-eng@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of English"},
    {"id": 5, "department": "Physics", "faculty_name": "Dr. S. Jayanthi", "designation": "Associate Professor & Head", "qualification": "M.Sc., Ph.D", "email": "jayanthi-phy@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Physics"},
    {"id": 6, "department": "Chemistry", "faculty_name": "Dr. M. Murugalakshmi", "designation": "Associate Professor & Head", "qualification": "M.Sc., M.Phil., Ph.D", "email": "murugalakshmi-chem@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Chemistry"},
    {"id": 7, "department": "Computer Science", "faculty_name": "Mrs. P. Prescilla", "designation": "Assistant Professor & Head", "qualification": "MCA, M.Phil", "email": "prescilla-cs@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Computer Science"},
    {"id": 8, "department": "Data Science", "faculty_name": "Mrs. D. Gangadevi", "designation": "Assistant Professor & Head", "qualification": "MCA., M.Phil., SET., NET.,", "email": "gangadevi-ds@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Data Science"},
]

FEES_DATA = [
    {"id": 1, "department_name": "Department of Data Science", "tuition_fee": "₹19,000", "other_fee": "₹970"},
    {"id": 2, "department_name": "Department of Computer Science", "tuition_fee": "₹18,500", "other_fee": "₹950"},
    {"id": 3, "department_name": "Department of English", "tuition_fee": "₹2,500", "other_fee": "₹650"},
    {"id": 4, "department_name": "Department of Tamil", "tuition_fee": "₹2,200", "other_fee": "₹650"},
    {"id": 5, "department_name": "Department of Physics", "tuition_fee": "₹3,200", "other_fee": "₹850"},
    {"id": 6, "department_name": "Department of Chemistry", "tuition_fee": "₹3,200", "other_fee": "₹850"},
    {"id": 7, "department_name": "Department of Botany", "tuition_fee": "₹3,000", "other_fee": "₹800"},
    {"id": 8, "department_name": "Department of Mathematics", "tuition_fee": "₹2,800", "other_fee": "₹700"},
    {"id": 9, "department_name": "Department of Commerce", "tuition_fee": "₹14,000", "other_fee": "₹850"},
]

GUIDES_DATA = [
    {"id": 1, "guide_name": "Dr. B. Ponni", "department": "Tamil", "specialization": "Modern Literature, Sangam Literature", "qualification": "M.A., M.Phil., Ph.D.", "email": "ponni-tam@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Research Supervisor in Tamil"},
    {"id": 2, "guide_name": "Dr. V. Meenakshi", "department": "Commerce", "specialization": "Banking & Financial Services", "qualification": "M.Com., M.Phil., Ph.D.", "email": "meenakshi-com@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Research Supervisor in Commerce"},
    {"id": 3, "guide_name": "Dr. K. Muthamil Selvi", "department": "English", "specialization": "Indian Writing in English, ELT", "qualification": "MA., M.Phil., B.Ed., Ph.D.", "email": "muthamil-eng@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Research Supervisor in English"},
    {"id": 4, "guide_name": "Dr. S. Jayanthi", "department": "Physics", "specialization": "Crystal Growth & Thin Films", "qualification": "M.Sc., Ph.D.", "email": "jayanthi-phy@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Research Supervisor in Physics"},
]

TRANSPORT_DATA = [
    {
        "id": 1,
        "bus_number": "SFRC-01",
        "driver_name": "Mr. Murugan",
        "bus_route": "Thiruthangal to SFRC Campus",
        "bus_stoppings": "Thiruthangal Bus Stand\nSivakasi New Bus Stand\nSFRC Main Gate",
        "bus_stop_timings": "07:45 AM\n08:00 AM\n08:20 AM"
    },
    {
        "id": 2,
        "bus_number": "SFRC-02",
        "driver_name": "Mr. Ramasamy",
        "bus_route": "Sattur to SFRC Campus",
        "bus_stoppings": "Sattur Bus Stand\nThayilpatti Junction\nSFRC Main Gate",
        "bus_stop_timings": "07:30 AM\n07:50 AM\n08:25 AM"
    },
    {
        "id": 3,
        "bus_number": "SFRC-03",
        "driver_name": "Mr. Selvam",
        "bus_route": "Srivilliputhur & Rajapalayam to SFRC Campus",
        "bus_stoppings": "Srivilliputhur Tower\nRajapalayam Bus Stand\nSFRC Main Gate",
        "bus_stop_timings": "07:20 AM\n07:45 AM\n08:25 AM"
    }
]

CONTACT_DATA = [
    {
        "id": 1,
        "office": "Admission Office",
        "phone": "+91 4562 220389",
        "email": "sfrc@sfrcollege.edu.in",
        "address": "Thiruthangal Road, Sivakasi - 626123, Tamil Nadu, India"
    },
    {
        "id": 2,
        "office": "Principal Office",
        "phone": "+91 4562 220389",
        "email": "principal@sfrcollege.edu.in",
        "address": "Main Administrative Block, SFRC Sivakasi"
    }
]

FAQ_DATA = [
    {
        "question": "What are the college working hours?",
        "answer": "College working hours are from 8:30 AM to 1:30 PM (Regular Shift) and 1:45 PM to 6:00 PM (Evening Shift)."
    },
    {
        "question": "How to apply for admissions?",
        "answer": "Admissions for UG and PG programmes can be applied online through the SFRC portal or directly at the Admission Office in the Administrative Block."
    },
    {
        "question": "What is the dress code?",
        "answer": "Students are required to adhere to the designated college uniform / formal attire reflecting academic decorum."
    }
]


# ── Helper Utilities ─────────────────────────────────────────────────────────

def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())

def contains_any(text: str, words: List[str]) -> bool:
    return any(word in text for word in words)

def best_match(user_text: str, options: List[str], cutoff: float = 0.55) -> Optional[str]:
    if not options:
        return None
    normalized_map = {normalize(option): option for option in options if option}
    matches = get_close_matches(normalize(user_text), list(normalized_map.keys()), n=1, cutoff=cutoff)
    if matches:
        return normalized_map[matches[0]]
    for option in options:
        if normalize(option) in normalize(user_text) or normalize(user_text) in normalize(option):
            return option
    return None


class PragyaService:
    @staticmethod
    def _tool_attendance(user: dict) -> str:
        name = user.get("name") or user.get("full_name") or "Student Scholar"
        reg_no = user.get("register_number", "22UCA042")
        return (
            f"📊 Attendance Record for {name} ({reg_no}):<br>"
            f"• Total Classes Held: 54<br>"
            f"• Classes Attended: 48<br>"
            f"• Current Attendance: 88.5%<br>"
            f"• Minimum Required: 75.0%<br>"
            f"• Status: In Good Standing (Eligible for End Semester Exams)"
        )

    @staticmethod
    def _tool_timetable(user: dict) -> str:
        return (
            "📅 Today's Class Schedule:<br>"
            "• 09:00 AM - 10:00 AM: 22UCSC61 - Cloud Architecture & DevOps (Lab 3) - Dr. K. Anitha<br>"
            "• 10:00 AM - 11:00 AM: 22UCSC62 - Web Application Development (LH 104) - Dr. M. Lakshmi<br>"
            "• 11:15 AM - 12:15 PM: 22UCSE63 - Machine Learning Fundamentals (Smart Room 2) - Prof. R. Priya<br>"
            "• 02:00 PM - 04:00 PM: 22UCSP64 - Full Stack Development Lab (Lab 2)"
        )

    @staticmethod
    def _tool_events() -> str:
        return (
            "🎉 Upcoming Campus Events:<br>"
            "1. TechSpark 2026: National Level Hackathon (Oct 15, 2026)<br>"
            "2. Workshop on Agentic AI & Next.js 16 (Oct 22, 2026)<br>"
            "3. Annual Inter-Collegiate Sports Meet 2026 (Nov 05, 2026)"
        )

    @staticmethod
    def _tool_mentor(user: dict) -> str:
        return (
            "👩‍🏫 Assigned Faculty Mentor Details:<br>"
            "• Mentor Name: Dr. K. Anitha, Ph.D.<br>"
            "• Designation: Associate Professor, Department of Computer Science<br>"
            "• Office Location: Room 204, PG Block<br>"
            "• Email: anitha.cs@sfrcollege.edu.in<br>"
            "• Mentoring Hours: Tuesdays & Thursdays (3:30 PM - 4:30 PM)"
        )

    @staticmethod
    def _tool_marks(user: dict) -> str:
        return (
            "📝 Academic Performance & Continuous Internal Assessment (CIA):<br>"
            "• 22UCSC61 Cloud Architecture: CIA-1: 88/100 | CIA-2: 92/100<br>"
            "• 22UCSC62 Web Application Dev: CIA-1: 82/100 | CIA-2: 89/100<br>"
            "• 22UCSE63 Machine Learning Fund: CIA-1: 91/100 | CIA-2: 94/100<br>"
            "• Cumulative Grade Point Average (CGPA): 8.65 / 10.0 (First Class with Distinction)"
        )

    @staticmethod
    def _tool_library() -> str:
        return (
            "SFRC IRC: 64,795 volumes | Open Mon-Sat 8AM-8PM (Sat 5PM)<br>"
            "E-Resources: J-Gate, DELNET, INFLIBNET N-List<br>"
            "Access with SFRC student ID card"
        )

    @staticmethod
    def _tool_hostel() -> str:
        return (
            "🏡 SFRC Residential Hostel Guidelines:<br>"
            "• Evening Roll Call: 6:30 PM daily<br>"
            "• Quiet Study Hours: 8:30 PM - 10:30 PM<br>"
            "• Outing Permission: Approved by Chief Warden Dr. S. Geetha with Parent verification"
        )

    @classmethod
    def _match_sfrc_assist_rules(cls, user_message: str) -> Optional[Tuple[str, List[str], List[str], str]]:
        """Exact matching engine replicated from SFRC_Assist/app.py."""
        msg = normalize(user_message)
        if not msg:
            return ("Please type your question.", MAIN_BUTTONS, ["SFRC Knowledge Base"], "general")

        # 1. Departments category selection
        if msg in ["department", "departments"]:
            return ("Please choose department category.", ["Aided", "Self", "Menu"], ["SFRC Academic Directory"], "department")

        if msg in ["aided", "ug aided", "aided departments"]:
            aided_depts = [d["department_name"] for d in DEPARTMENTS_DATA if normalize(d["category"]) == "aided"]
            reply = "Available Aided departments:<br>" + "<br>".join(aided_depts) if aided_depts else "No aided departments found."
            return (reply, aided_depts[:8] + ["Menu"], ["SFRC Academic Directory"], "department")

        if msg in ["self", "self-finance", "self finance", "self departments"]:
            self_depts = [d["department_name"] for d in DEPARTMENTS_DATA if "self" in normalize(d["category"])]
            reply = "Available Self departments:<br>" + "<br>".join(self_depts) if self_depts else "No self departments found."
            return (reply, self_depts[:8] + ["Menu"], ["SFRC Academic Directory"], "department")

        # 2. Greetings / Welcome
        if contains_any(msg, ["hi", "hello", "hey", "hii", "start", "menu", "home", "pragya"]):
            welcome = (
                "Hello 👋 <b>Welcome to The Standard Fireworks Rajaratnam College for Women!</b><br>"
                "I'm <b>Pragya</b>, your AI guide.<br>"
                "I can help you with:<br>"
                "🎓 <a href='#' onclick=\"sendSuggestion('admissions'); return false;\">Admissions</a><br>"
                "🏛 <a href='#' onclick=\"sendSuggestion('departments'); return false;\">Departments</a><br>"
                "💰 <a href='#' onclick=\"sendSuggestion('fees'); return false;\">Fees</a><br>"
                "👩🏻‍🏫 <a href='#' onclick=\"sendSuggestion('faculty'); return false;\">Faculty</a><br>"
                "👨🏻‍🎓 <a href='#' onclick=\"sendSuggestion('phd guides'); return false;\">Ph.D Guides</a><br>"
                "🚌 <a href='#' onclick=\"sendSuggestion('transport'); return false;\">Transport</a><br>"
                "📞 <a href='#' onclick=\"sendSuggestion('contact'); return false;\">Contact</a>"
            )
            return (welcome, MAIN_BUTTONS, ["SFRC System"], "greeting")

        # 3. FAQ Lookup
        faq_questions = [f["question"] for f in FAQ_DATA]
        matched_faq = best_match(user_message, faq_questions, cutoff=0.75)
        if matched_faq:
            faq_item = next((f for f in FAQ_DATA if f["question"] == matched_faq), None)
            if faq_item:
                return (faq_item["answer"], MAIN_BUTTONS, ["SFRC FAQ"], "faq")

        # 4. Contact & Address
        if contains_any(msg, ["contact", "phone", "email", "address", "office", "admission office"]):
            contact_text = []
            for row in CONTACT_DATA:
                block = []
                if row.get("office"): block.append(f"🏢 {row['office']}")
                if row.get("phone"): block.append(f"📞 {row['phone']}")
                if row.get("email"): block.append(f"✉ {row['email']}")
                if row.get("address"): block.append(f"📍 {row['address']}")
                if block: contact_text.append("<br>".join(block))
            return ("<br><br>".join(contact_text), ["Admissions", "Transport", "Menu"], ["SFRC Contact Directory"], "contact")

        # 5. Fees Lookups
        if contains_any(msg, ["fee", "fees", "tuition", "cost", "payment"]):
            dept_names = [f["department_name"] for f in FEES_DATA]
            matched_dept = None
            for dept in dept_names:
                clean_dept = normalize(dept).replace("department of", "").strip()
                if clean_dept in msg or normalize(dept) in msg:
                    matched_dept = dept
                    break
            if not matched_dept:
                matched_dept = best_match(user_message, dept_names, cutoff=0.55)

            if matched_dept:
                row = next((f for f in FEES_DATA if normalize(f["department_name"]) == normalize(matched_dept)), None)
                if row:
                    reply = (
                        f"<b>Department:</b> {row['department_name']}<br>"
                        f"<b>Tuition Fee:</b> {row['tuition_fee']}<br>"
                        f"<b>Other Fee:</b> {row.get('other_fee') or 'N/A'}"
                    )
                    return (reply, ["Admissions", "Departments", "Contact", "Menu"], ["SFRC Fee Schedule"], "fees")

            return (
                "Please mention the department name to get fee details.<br>Example: <i>What is the fee for Data Science?</i>",
                dept_names[:8] + ["Menu"],
                ["SFRC Fee Schedule"],
                "fees"
            )

        # 5. Ph.D Guides
        if contains_any(msg, ["guide", "guides", "phd guide", "ph.d guide", "research guide", "supervisor"]):
            guide_names = [g["guide_name"] for g in GUIDES_DATA]
            departments = sorted(list(set(g["department"] for g in GUIDES_DATA)))

            for row in GUIDES_DATA:
                if normalize(row["guide_name"]) in msg:
                    reply = (
                        f"<b>Guide Name:</b> {row['guide_name']}<br>"
                        f"<b>Department:</b> {row['department']}<br>"
                        f"<b>Specialization:</b> {row['specialization'] or 'N/A'}<br>"
                        f"<b>Qualification:</b> {row['qualification'] or 'N/A'}<br>"
                        f"<b>Email:</b> {row['email'] or 'N/A'}<br>"
                        f"<b>Phone:</b> {row.get('phone') or 'N/A'}<br>"
                        f"<b>Description:</b> {row['description'] or 'N/A'}"
                    )
                    return (reply, ["PhD Guides", "Departments", "Contact", "Menu"], ["SFRC Research Directory"], "guides")

            for dept in departments:
                if normalize(dept) in msg:
                    dept_guides = [g["guide_name"] for g in GUIDES_DATA if normalize(g["department"]) == normalize(dept)]
                    return (f"Ph.D guides in {dept}:<br>" + "<br>".join(dept_guides), dept_guides[:8] + ["Menu"], ["SFRC Research Directory"], "guides")

            return (
                "Please mention a guide name or department.<br>Example: <i>Show Ph.D guides in Tamil</i>",
                departments[:8] + ["Menu"],
                ["SFRC Research Directory"],
                "guides"
            )

        # 6. Transport / Bus Routes
        if contains_any(msg, ["transport", "bus", "route", "timing", "stop", "stopping", "driver"]):
            routes = [t["bus_route"] for t in TRANSPORT_DATA]
            bus_numbers = [t["bus_number"] for t in TRANSPORT_DATA]

            for row in TRANSPORT_DATA:
                if (
                    normalize(row["bus_route"]) in msg
                    or normalize(row["bus_number"]) in msg
                    or (str(row["id"]) in msg and ("route" in msg or "bus" in msg))
                    or ("route 1" in msg and row["id"] == 1)
                    or ("route 2" in msg and row["id"] == 2)
                    or ("route 3" in msg and row["id"] == 3)
                ):
                    reply = (
                        f"<b>Bus Number:</b> {row['bus_number']}<br>"
                        f"<b>Driver Name:</b> {row['driver_name']}<br>"
                        f"<b>Route:</b> {row['bus_route']}<br>"
                        f"<b>Bus Stoppings:</b><br>{row['bus_stoppings'].replace(chr(10), '<br>')}<br>"
                        f"<b>Bus Stop Timings:</b><br>{row['bus_stop_timings'].replace(chr(10), '<br>')}"
                    )
                    return (reply, ["Transport", "Contact", "Menu"], ["SFRC Transport Directorate"], "transport")

            matched_route = best_match(user_message, routes, cutoff=0.55)
            if matched_route:
                row = next((t for t in TRANSPORT_DATA if normalize(t["bus_route"]) == normalize(matched_route)), None)
                if row:
                    reply = (
                        f"<b>Bus Number:</b> {row['bus_number']}<br>"
                        f"<b>Driver Name:</b> {row['driver_name']}<br>"
                        f"<b>Route:</b> {row['bus_route']}<br>"
                        f"<b>Bus Stoppings:</b><br>{row['bus_stoppings'].replace(chr(10), '<br>')}<br>"
                        f"<b>Bus Stop Timings:</b><br>{row['bus_stop_timings'].replace(chr(10), '<br>')}"
                    )
                    return (reply, ["Transport", "Contact", "Menu"], ["SFRC Transport Directorate"], "transport")

            return (
                "Please mention a bus route or bus number.<br>Example: <i>Show transport details for Route 1</i>",
                routes[:8] + ["Menu"],
                ["SFRC Transport Directorate"],
                "transport"
            )

        # 7. Faculty Members & Teachers
        if contains_any(msg, ["faculty", "staff", "teacher", "professor", "lecturer", "ponni", "deepa", "meenakshi", "prescilla", "gangadevi", "jayanthi"]):
            faculty_names = [f["faculty_name"] for f in FACULTY_DATA]
            departments = sorted(list(set(f["department"] for f in FACULTY_DATA)))

            for row in FACULTY_DATA:
                if normalize(row["faculty_name"]) in msg or (row["faculty_name"].split(".")[-1].lower() in msg and len(row["faculty_name"].split(".")[-1]) > 3):
                    reply = (
                        f"<b>Faculty Name:</b> {row['faculty_name']}<br>"
                        f"<b>Department:</b> {row['department']}<br>"
                        f"<b>Designation:</b> {row['designation']}<br>"
                        f"<b>Qualification:</b> {row['qualification'] or 'N/A'}<br>"
                        f"<b>Email:</b> {row['email'] or 'N/A'}<br>"
                        f"<b>Phone:</b> {row.get('phone') or 'N/A'}<br>"
                        f"<b>Description:</b> {row['description'] or 'N/A'}"
                    )
                    return (reply, ["Faculty", "Departments", "Contact", "Menu"], ["SFRC Faculty Registry"], "faculty")

            matched_faculty = best_match(user_message, faculty_names, cutoff=0.65)
            if matched_faculty:
                row = next((f for f in FACULTY_DATA if normalize(f["faculty_name"]) == normalize(matched_faculty)), None)
                if row:
                    reply = (
                        f"<b>Faculty Name:</b> {row['faculty_name']}<br>"
                        f"<b>Department:</b> {row['department']}<br>"
                        f"<b>Designation:</b> {row['designation']}<br>"
                        f"<b>Qualification:</b> {row['qualification'] or 'N/A'}<br>"
                        f"<b>Email:</b> {row['email'] or 'N/A'}<br>"
                        f"<b>Phone:</b> {row.get('phone') or 'N/A'}<br>"
                        f"<b>Description:</b> {row['description'] or 'N/A'}"
                    )
                    return (reply, ["Faculty", "Departments", "Contact", "Menu"], ["SFRC Faculty Registry"], "faculty")

            for dept in departments:
                if normalize(dept) in msg:
                    dept_faculty = [f["faculty_name"] for f in FACULTY_DATA if normalize(f["department"]) == normalize(dept)]
                    return (f"Faculty members in {dept}:<br>" + "<br>".join(dept_faculty), dept_faculty[:8] + ["Menu"], ["SFRC Faculty Registry"], "faculty")

            return (
                "Please mention a faculty name or department.<br>Example: <i>Show faculty in Botany</i>",
                departments[:8] + ["Menu"],
                ["SFRC Faculty Registry"],
                "faculty"
            )

        # 8. Specific Department / HOD lookups
        if contains_any(msg, ["department", "departments", "hod", "head of department", "ug", "pg", "ph.d", "phd"]):
            dept_names = [d["department_name"] for d in DEPARTMENTS_DATA]
            matched_dept = None
            for dept in dept_names:
                clean_dept = normalize(dept).replace("department of", "").strip()
                if clean_dept and (clean_dept in msg or normalize(dept) in msg):
                    matched_dept = dept
                    break
            if not matched_dept:
                matched_dept = best_match(user_message, dept_names, cutoff=0.55)

            if matched_dept:
                row = next((d for d in DEPARTMENTS_DATA if normalize(d["department_name"]) == normalize(matched_dept)), None)
                if row:
                    reply = (
                        f"<b>Department:</b> {row['department_name']}<br>"
                        f"<b>Level:</b> {row['level']}<br>"
                        f"<b>Category:</b> {row['category']}<br>"
                        f"<b>HOD:</b> {row['hod']}<br>"
                        f"<b>Description:</b> {row['description'] or 'N/A'}"
                    )
                    return (reply, ["Faculty", "PhD Guides", "Fees", "Menu"], ["SFRC Academic Directory"], "department")

            filtered = DEPARTMENTS_DATA
            if "ug" in msg:
                filtered = [r for r in filtered if normalize(r["level"]) == "ug"]
            elif "pg" in msg:
                filtered = [r for r in filtered if normalize(r["level"]) == "pg"]
            elif "ph.d" in msg or "phd" in msg:
                filtered = [r for r in filtered if "ph" in normalize(r["level"])]

            names = [r["department_name"] for r in filtered]
            if names:
                return ("Available departments:<br>" + "<br>".join(names), names[:8] + ["Menu"], ["SFRC Academic Directory"], "department")


        # 10. Admissions
        if contains_any(msg, ["admission", "admissions", "apply", "application", "join", "eligibility"]):
            dept_rows = DEPARTMENTS_DATA
            filtered = dept_rows
            if "ug" in msg:
                filtered = [r for r in filtered if normalize(r["level"]) == "ug"]
            elif "pg" in msg:
                filtered = [r for r in filtered if normalize(r["level"]) == "pg"]
            elif "ph.d" in msg or "phd" in msg:
                filtered = [r for r in filtered if "ph" in normalize(r["level"])]

            names = [r["department_name"] for r in filtered]
            if names:
                return ("Admissions-related departments:<br>" + "<br>".join(names), names[:8] + ["Fees", "Contact", "Menu"], ["SFRC Admissions Office"], "admissions")

            return (
                "You can ask about UG, PG, Ph.D, aided, or self-finance admissions.",
                ["UG Admissions", "PG Admissions", "PhD Admissions", "Contact", "Menu"],
                ["SFRC Admissions Office"],
                "admissions"
            )

        return None

    @classmethod
    async def process_chat(
        cls,
        user_message: str,
        user: dict,
        conversation_id: Optional[str] = None,
        db: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        """Main chat orchestration pipeline combining SFRC_Assist deterministic logic + student tools + RAG fallback."""
        user_id = user.get("id") or user.get("sub") or "00000000-0000-0000-0000-000000000001"
        user_role = user.get("role", "student")
        user_email = user.get("email", "student@sfrcollege.edu.in")
        user_name = user.get("name") or user.get("full_name") or "Student Scholar"

        # Log query to audit_logs
        await log_audit_event(
            user_id=user_id,
            action="pragya_query",
            resource_type="ai",
            resource_id=conversation_id,
            details={"message": user_message[:200], "role": user_role},
            db=db,
        )

        # 1. Ensure conversation exists
        conv = None
        if conversation_id:
            conv = next((c for c in AI_CONVERSATIONS if c["id"] == conversation_id), None)

        if not conv:
            conv_id = conversation_id or f"conv-{uuid.uuid4().hex[:8]}"
            conv = {
                "id": conv_id,
                "user_id": user_id,
                "title": user_message[:40] + ("..." if len(user_message) > 40 else ""),
                "metadata": {},
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            AI_CONVERSATIONS.insert(0, conv)

        conv_id = conv["id"]
        conv_meta = conv.setdefault("metadata", {})

        # 2. Check student cross-student data isolation security
        target_student_match = re.search(r'\b(2[0-9]U[A-Z]{2,4}[0-9]{3})\b', user_message.upper())
        own_reg = (user.get("register_number") or "22UCA042").upper()
        if user_role == "student" and target_student_match:
            searched_reg = target_student_match.group(1)
            if searched_reg != own_reg:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access Restricted: You are not authorized to view academic or personal records of other students."
                )

        # 3. Multi-turn Complaint Flow
        complaint_step = conv_meta.get("complaint_step")
        if complaint_step == "awaiting_description":
            extracted_title = user_message.strip()
            loc_match = re.search(r'(?:in|at|room|block|lab|hall)\s+([A-Za-z0-9\s\-]+)', extracted_title, re.IGNORECASE)
            location = loc_match.group(0).strip() if loc_match else "Campus Facility"
            title = extracted_title[:60]

            conv_meta["complaint_step"] = "awaiting_confirmation"
            conv_meta["pending_complaint"] = {
                "title": title,
                "location": location,
                "description": extracted_title,
                "priority": "Medium",
            }
            conv["updated_at"] = datetime.now(timezone.utc).isoformat()

            reply = f"Filing: {title} at {location}. Priority: Medium. Proceed? (yes/no)"
            sources = ["Campus Care CivicFix Engine"]
            buttons = ["Yes", "No"]
            cls._record_messages(conv_id, user_message, reply, sources, "complaint")
            return {
                "reply": reply,
                "conversation_id": conv_id,
                "sources": sources,
                "intent": "complaint",
                "buttons": buttons,
            }

        elif complaint_step == "awaiting_confirmation":
            resp_lower = user_message.strip().lower()
            if any(w in resp_lower for w in ["yes", "y", "proceed", "sure", "confirm", "ok", "okay"]):
                pending = conv_meta.get("pending_complaint", {})
                next_num = len(COMPLAINTS_REGISTRY) + 23
                ref = f"CC-{next_num:05d}"
                new_complaint = {
                    "id": f"cmp-{uuid.uuid4().hex[:8]}",
                    "complaint_number": ref,
                    "title": pending.get("title", "Reported Campus Issue"),
                    "category": "Maintenance",
                    "description": pending.get("description", "Reported via Pragya AI Assistant"),
                    "location": pending.get("location", "Campus Facility"),
                    "priority": pending.get("priority", "Medium"),
                    "status": "Received",
                    "submitted_by": user_id,
                    "reporter_name": user_name,
                    "reporter_email": user_email,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                COMPLAINTS_REGISTRY.insert(0, new_complaint)

                conv_meta.pop("complaint_step", None)
                conv_meta.pop("pending_complaint", None)
                conv["updated_at"] = datetime.now(timezone.utc).isoformat()

                reply = f"Ticket <b>{ref}</b> created successfully! Track status in Campus Care."
                sources = ["Campus Care Service Desk"]
                buttons = MAIN_BUTTONS
                cls._record_messages(conv_id, user_message, reply, sources, "complaint")
                return {
                    "reply": reply,
                    "conversation_id": conv_id,
                    "sources": sources,
                    "intent": "complaint",
                    "buttons": buttons,
                }
            else:
                conv_meta.pop("complaint_step", None)
                conv_meta.pop("pending_complaint", None)
                conv["updated_at"] = datetime.now(timezone.utc).isoformat()
                reply = "Complaint filing cancelled. How else can I help you?"
                sources = []
                buttons = MAIN_BUTTONS
                cls._record_messages(conv_id, user_message, reply, sources, "complaint")
                return {
                    "reply": reply,
                    "conversation_id": conv_id,
                    "sources": sources,
                    "intent": "complaint",
                    "buttons": buttons,
                }

        # 4. First Check Deterministic SFRC_Assist Rule Engine
        sfrc_result = cls._match_sfrc_assist_rules(user_message)
        if sfrc_result:
            reply, buttons, sources, intent = sfrc_result
            cls._record_messages(conv_id, user_message, reply, sources, intent)
            conv["updated_at"] = datetime.now(timezone.utc).isoformat()
            return {
                "reply": reply,
                "conversation_id": conv_id,
                "sources": sources,
                "intent": intent,
                "buttons": buttons,
            }

        # 5. Check Student Tools Intent
        msg_clean = normalize(user_message)
        tool_result: Optional[str] = None
        tool_source: Optional[str] = None
        tool_intent: Optional[str] = None

        if contains_any(msg_clean, ["attendance", "present", "absent", "od", "duty leave"]):
            tool_result = cls._tool_attendance(user)
            tool_source = "SFRC Attendance Registry"
            tool_intent = "attendance"
        elif contains_any(msg_clean, ["timetable", "schedule", "class today", "classes today", "periods"]):
            tool_result = cls._tool_timetable(user)
            tool_source = "SFRC Academic Timetable"
            tool_intent = "timetable"
        elif contains_any(msg_clean, ["event", "upcoming", "workshop", "hackathon", "symposium", "techspark"]):
            tool_result = cls._tool_events()
            tool_source = "SFRC Campus Events Calendar"
            tool_intent = "events"
        elif contains_any(msg_clean, ["mentor", "tutor", "advisor", "mentoring"]):
            tool_result = cls._tool_mentor(user)
            tool_source = "Faculty Mentorship Directory"
            tool_intent = "mentor"
        elif contains_any(msg_clean, ["mark", "marks", "grade", "cia", "cgpa", "internal"]):
            tool_result = cls._tool_marks(user)
            tool_source = "Controller of Examinations Portal"
            tool_intent = "marks"
        elif contains_any(msg_clean, ["library", "irc", "book", "volumes", "delnet", "jgate"]):
            tool_result = cls._tool_library()
            tool_source = "SFRC Library Information"
            tool_intent = "library"
        elif contains_any(msg_clean, ["hostel", "warden", "curfew", "mess"]):
            tool_result = cls._tool_hostel()
            tool_source = "SFRC Hostel Rules"
            tool_intent = "hostel"
        elif contains_any(msg_clean, ["report", "broken", "not working", "projector", "wifi", "fan", "leak", "complaint"]):
            conv_meta["complaint_step"] = "awaiting_description"
            conv["updated_at"] = datetime.now(timezone.utc).isoformat()
            reply = "I can help report that. Describe briefly (what issue, which room/block)?"
            sources = ["Campus Care Service Desk"]
            buttons = ["Cancel"]
            cls._record_messages(conv_id, user_message, reply, sources, "complaint")
            return {
                "reply": reply,
                "conversation_id": conv_id,
                "sources": sources,
                "intent": "complaint",
                "buttons": buttons,
            }

        # 6. RAG Retrieval & Fallback
        embedder = get_embedding_provider()
        rag_chunks = await retrieve(query=user_message, top_k=3, embedder=embedder, db=db)
        rag_sources = [c["source_title"] for c in rag_chunks] if rag_chunks else []
        rag_context = "\n\n".join([f"[{c['source_title']}]: {c['content']}" for c in rag_chunks])

        all_sources = []
        if tool_source:
            all_sources.append(tool_source)
        for s in rag_sources:
            if s not in all_sources:
                all_sources.append(s)

        llm = get_llm_provider()
        reply: str = ""

        if llm is not None:
            system_prompt = (
                "You are Pragya, the AI assistant for MyZone SFRC 360 at "
                "The Standard Fireworks Rajaratnam College for Women, Sivakasi. "
                "Answer questions helpfully and accurately using the institutional context and live database tools provided."
            )
            combined_context = ""
            if tool_result:
                combined_context += f"Live Institutional Data:\n{tool_result}\n\n"
            if rag_context:
                combined_context += f"Knowledge Base Documents:\n{rag_context}\n"

            try:
                reply = await llm.generate(system=system_prompt, user=user_message, context=combined_context)
            except Exception:
                reply = tool_result or (
                    f"{rag_context}" if rag_context
                    else (
                        "Sorry, I could not fully understand your question.<br>"
                        "You can ask things like:<br>"
                        "• What is the fee for Physics?<br>"
                        "• Who is the HOD of Chemistry?<br>"
                        "• Show faculty in Mathematics<br>"
                        "• Bus route details<br>"
                        "• College contact details"
                    )
                )
        else:
            if tool_result:
                reply = tool_result
            elif rag_context:
                reply = f"Here is the institutional information:<br><br>{rag_context}"
            else:
                reply = (
                    "Sorry, I could not fully understand your question.<br>"
                    "You can ask things like:<br>"
                    "• What is the fee for Physics?<br>"
                    "• Who is the HOD of Chemistry?<br>"
                    "• Show faculty in Mathematics<br>"
                    "• Bus route details<br>"
                    "• College contact details"
                )

        cls._record_messages(conv_id, user_message, reply, all_sources, tool_intent)
        conv["updated_at"] = datetime.now(timezone.utc).isoformat()

        return {
            "reply": reply,
            "conversation_id": conv_id,
            "sources": all_sources,
            "intent": tool_intent,
            "buttons": MAIN_BUTTONS,
        }

    @staticmethod
    def _record_messages(
        conv_id: str,
        user_msg: str,
        reply: str,
        sources: List[str],
        intent: Optional[str],
    ):
        now = datetime.now(timezone.utc).isoformat()
        AI_MESSAGES.append({
            "id": f"msg-{uuid.uuid4().hex[:8]}",
            "conversation_id": conv_id,
            "role": "user",
            "content": user_msg,
            "sources": [],
            "intent": intent,
            "created_at": now,
        })
        AI_MESSAGES.append({
            "id": f"msg-{uuid.uuid4().hex[:8]}",
            "conversation_id": conv_id,
            "role": "assistant",
            "content": reply,
            "sources": sources,
            "intent": intent,
            "created_at": now,
        })
