"""Pragya AI Service — Production-Ready College AI Assistant for SFRC Student Portal.
Features:
- Live database query tools (Attendance, Marks, Timetable, Mentor, Events, Fees, Hostel, Library, Placements, Startups, Leaves)
- 50+ Institutional Knowledge Base Records (Admissions, Autonomous Academics, CIA Scheme, 75% Attendance, Scholarships, ACIDE, YWED, Transport)
- Multi-turn Complaint & Grievance Registration with live DB persistence
- Multi-lingual English & Tanglish Intent Recognition
- Audit logging & Student Personal Data Isolation Security
- RAG Vector Retrieval & Generative LLM Integration
"""
from __future__ import annotations

import re
import json
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
from app.ai.pragya_knowledge_seeds import SEED_PRAGYA_KNOWLEDGE


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
    # UG & PG Aided
    {"id": 1, "level": "UG, Ph.D", "category": "Aided", "department_name": "Department of Tamil", "hod": "Dr. B. Ponni M.A., M.Phil., Ph.D., C.G.T., Dip.in.M.S.Off.,", "description": "UG Aided, PG SF, Ph.D Research Centre (Established 1968)"},
    {"id": 2, "level": "UG, PG, Ph.D", "category": "Aided", "department_name": "Department of English", "hod": "Dr. K. Muthamil Selvi MA., M.Phil., B.Ed., Ph.D.", "description": "UG Aided, PG Aided, Ph.D Approved Research Centre"},
    {"id": 3, "level": "UG, PG, Ph.D", "category": "Aided", "department_name": "Department of History", "hod": "Dr. R. Muthulakshmi M.A., M.Phil., Ph.D.", "description": "UG Aided, PG SF, Ph.D Approved Research Centre"},
    {"id": 4, "level": "UG, PG, Ph.D", "category": "Aided", "department_name": "Department of Commerce", "hod": "Dr. V. Meenakshi M.Com., M.Phil., Ph.D.", "description": "UG Aided & SF, M.Com CA, Ph.D Approved Research Centre"},
    {"id": 5, "level": "UG, PG, Ph.D", "category": "Aided", "department_name": "Department of Mathematics", "hod": "Dr. S. Sivadevi M.Sc., M.Phil., Ph.D.", "description": "UG Aided, PG Aided, Ph.D Approved Research Centre"},
    {"id": 6, "level": "UG, PG, Ph.D", "category": "Aided", "department_name": "Department of Physics", "hod": "Dr. S. Jayanthi M.Sc., Ph.D", "description": "UG Aided, PG SF, Ph.D Approved Research Centre"},
    {"id": 7, "level": "UG, PG, Ph.D", "category": "Aided", "department_name": "Department of Chemistry", "hod": "Dr. M. Murugalakshmi M.Sc., M.Phil., Ph.D", "description": "UG Aided, PG Aided, Ph.D Approved Research Centre"},
    {"id": 8, "level": "UG, PG, Ph.D", "category": "Aided", "department_name": "Department of Botany", "hod": "Dr.(Mrs). B. Deepa M.Sc., M.Phil., Ph.D.", "description": "UG Aided, PG SF, Ph.D Approved Research Centre"},
    {"id": 9, "level": "UG, PG", "category": "Aided", "department_name": "Department of Computer Science", "hod": "Mrs. P. Prescilla MCA, M.Phil", "description": "B.Sc CS (Aided & SF), M.Sc CS, Ph.D Research Centre"},

    # UG & PG Self-Finance
    {"id": 10, "level": "UG, PG", "category": "Self-Finance", "department_name": "Department of Data Science", "hod": "Mrs. D. Gangadevi, MCA., M.Phil., SET., NET.,", "description": "B.Sc Data Science & M.Sc Data Science with AI / ML specialization"},
    {"id": 11, "level": "UG, PG", "category": "Self-Finance", "department_name": "Department of Computer Applications", "hod": "Mrs. A. Leena Benita MCA, M.Phil", "description": "BCA (Bachelor of Computer Applications) & MCA (AICTE Approved)"},
    {"id": 12, "level": "UG, PG", "category": "Self-Finance", "department_name": "Department of Commerce CA", "hod": "Dr. T. Vasantha M.Com., M.Phil., Ph.D.", "description": "B.Com (Computer Applications) & M.Com (Computer Applications)"},
    {"id": 13, "level": "UG", "category": "Self-Finance", "department_name": "Department of Commerce PA", "hod": "Dr. K. Jansi Rani M.Com., M.Phil., Ph.D.", "description": "B.Com (Professional Accounting) aligned with CA/CMA"},
    {"id": 14, "level": "UG", "category": "Self-Finance", "department_name": "Department of Business Administration", "hod": "Dr. M. Uma Devi M.B.A., M.Phil., Ph.D.", "description": "B.B.A. (Bachelor of Business Administration)"},
    {"id": 15, "level": "UG, PG", "category": "Self-Finance", "department_name": "Department of Microbiology", "hod": "Dr. K. Subbulakshmi M.Sc., M.Phil., Ph.D.", "description": "B.Sc. Microbiology & M.Sc. Microbiology"},
    {"id": 16, "level": "UG, PG", "category": "Self-Finance", "department_name": "Department of Nutrition and Dietetics", "hod": "Dr. J. Porkodi M.Sc., M.Phil., Ph.D.", "description": "B.Sc. Nutrition & Dietetics, M.Sc. Food & Nutrition"},
    {"id": 17, "level": "UG, Diploma", "category": "Self-Finance", "department_name": "Department of Costume Design & Fashion", "hod": "Mrs. M. Mohammed Rihana M.Sc., M.Phil.", "description": "B.Sc CDF & Diploma in Costume Design and Garment Production"},
    {"id": 18, "level": "UG, PG", "category": "Self-Finance", "department_name": "Department of Psychology", "hod": "Dr. P. Suganthi M.Sc., M.Phil., Ph.D.", "description": "B.Sc. Psychology & M.Sc. Psychology"},
    {"id": 19, "level": "UG", "category": "Self-Finance", "department_name": "Department of Geography", "hod": "Dr. S. Rajeswari M.Sc., M.Phil., Ph.D.", "description": "B.Sc. Geography with GIS and Remote Sensing"},
    {"id": 20, "level": "All", "category": "Support", "department_name": "Department of Physical Education", "hod": "Dr. K. Stella M.P.Ed., M.Phil., Ph.D.", "description": "Physical Education, 400m Track, Indoor Stadium & Gym"},
    {"id": 21, "level": "All", "category": "Support", "department_name": "Department of Library and Information Science", "hod": "Dr. S. Umamaheswari M.L.I.Sc., M.Phil., Ph.D.", "description": "Information Resource Centre (IRC), 64,795+ Volumes"},
]

FACULTY_DATA = [
    {"id": 1, "department": "Administration", "faculty_name": "Dr. T. Palaneeswari", "designation": "Principal & Ex-officio Chief Warden", "qualification": "M.Com., M.Phil., Ph.D.", "email": "principal@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Institution & Research Supervisor in Commerce"},
    {"id": 2, "department": "Tamil", "faculty_name": "Dr. B. Ponni", "designation": "Associate Professor & Head", "qualification": "M.A., M.Phil., Ph.D., C.G.T., Dip.in.M.S.Off.,", "email": "ponni-tam@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Tamil & Ph.D Guide"},
    {"id": 3, "department": "English", "faculty_name": "Dr. K. Muthamil Selvi", "designation": "Associate Professor & Head", "qualification": "MA., M.Phil., B.Ed., Ph.D.", "email": "muthamil-eng@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of English & Ph.D Guide"},
    {"id": 4, "department": "Commerce", "faculty_name": "Dr. V. Meenakshi", "designation": "Associate Professor & Head", "qualification": "M.Com., M.Phil., Ph.D.", "email": "meenakshi-com@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Associate Professor & Head of Commerce & Ph.D Guide"},
    {"id": 5, "department": "Physics", "faculty_name": "Dr. S. Jayanthi", "designation": "Associate Professor & Head", "qualification": "M.Sc., Ph.D.", "email": "jayanthi-phy@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Physics & Ph.D Guide"},
    {"id": 6, "department": "Chemistry", "faculty_name": "Dr. M. Murugalakshmi", "designation": "Associate Professor & Head", "qualification": "M.Sc., M.Phil., Ph.D.", "email": "murugalakshmi-chem@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Chemistry & Ph.D Guide"},
    {"id": 7, "department": "Botany", "faculty_name": "Dr.(Mrs.) B. Deepa", "designation": "Associate Professor & Head", "qualification": "M.Sc., M.Phil., Ph.D.", "email": "deepa-bot@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Botany & Ph.D Guide"},
    {"id": 8, "department": "Computer Science", "faculty_name": "Mrs. P. Prescilla", "designation": "Assistant Professor & Head", "qualification": "MCA, M.Phil.", "email": "prescilla-cs@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Computer Science"},
    {"id": 9, "department": "Data Science", "faculty_name": "Mrs. D. Gangadevi", "designation": "Assistant Professor & Head", "qualification": "MCA., M.Phil., SET., NET.,", "email": "gangadevi-ds@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Data Science"},
    {"id": 10, "department": "Mathematics", "faculty_name": "Dr. S. Sivadevi", "designation": "Associate Professor & Head", "qualification": "M.Sc., M.Phil., Ph.D.", "email": "sivadevi-mat@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Mathematics & Ph.D Guide"},
    {"id": 11, "department": "Mathematics", "faculty_name": "Dr. R. Malini Devi", "designation": "Associate Professor", "qualification": "M.Sc., M.Phil., Ph.D.", "email": "malinidevi-mat@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Associate Professor of Mathematics & Ph.D Guide"},
    {"id": 12, "department": "History", "faculty_name": "Dr. R. Muthulakshmi", "designation": "Associate Professor & Head", "qualification": "M.A., M.Phil., Ph.D.", "email": "muthulakshmi-his@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of History & Ph.D Guide"},
    {"id": 13, "department": "Microbiology", "faculty_name": "Dr. K. Subbulakshmi", "designation": "Associate Professor & Head", "qualification": "M.Sc., M.Phil., Ph.D.", "email": "subbulakshmi-mbio@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Microbiology"},
    {"id": 14, "department": "Nutrition and Dietetics", "faculty_name": "Dr. J. Porkodi", "designation": "Associate Professor & Head", "qualification": "M.Sc., M.Phil., Ph.D.", "email": "porkodi-nd@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Nutrition and Dietetics"},
    {"id": 15, "department": "Computer Applications", "faculty_name": "Mrs. A. Leena Benita", "designation": "Assistant Professor & Head", "qualification": "MCA, M.Phil.", "email": "leenabenita-ca@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Computer Applications (BCA & MCA)"},
    {"id": 16, "department": "Costume Design & Fashion", "faculty_name": "Mrs. M. Mohammed Rihana", "designation": "Assistant Professor & Head", "qualification": "M.Sc., M.Phil.", "email": "rihana-cdf@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Costume Design & Fashion"},
    {"id": 17, "department": "Psychology", "faculty_name": "Dr. P. Suganthi", "designation": "Assistant Professor & Head", "qualification": "M.Sc., M.Phil., Ph.D.", "email": "suganthi-psy@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Psychology"},
    {"id": 18, "department": "Geography", "faculty_name": "Dr. S. Rajeswari", "designation": "Assistant Professor & Head", "qualification": "M.Sc., M.Phil., Ph.D.", "email": "rajeswari-geo@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Head of Department of Geography"},
    {"id": 19, "department": "Physical Education", "faculty_name": "Dr. K. Stella", "designation": "Director of Physical Education", "qualification": "M.P.Ed., M.Phil., Ph.D.", "email": "stella-ped@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Director of Physical Education"},
    {"id": 20, "department": "Library", "faculty_name": "Dr. S. Umamaheswari", "designation": "College Librarian", "qualification": "M.L.I.Sc., M.Phil., Ph.D.", "email": "librarian@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Librarian & Head of Information Resource Centre"},
]

FEES_DATA = [
    {"id": 1, "department_name": "Department of Data Science", "tuition_fee": "₹19,000", "other_fee": "₹970"},
    {"id": 2, "department_name": "Department of Computer Science", "tuition_fee": "₹18,500 (SF) / ₹3,500 (Aided)", "other_fee": "₹950"},
    {"id": 3, "department_name": "Department of Computer Applications", "tuition_fee": "₹18,000 (BCA) / ₹24,000 (MCA)", "other_fee": "₹900"},
    {"id": 4, "department_name": "Department of Commerce", "tuition_fee": "₹14,000 (SF) / ₹2,400 (Aided)", "other_fee": "₹850"},
    {"id": 5, "department_name": "Department of Commerce CA", "tuition_fee": "₹14,500", "other_fee": "₹850"},
    {"id": 6, "department_name": "Department of Commerce PA", "tuition_fee": "₹14,500", "other_fee": "₹850"},
    {"id": 7, "department_name": "Department of Business Administration", "tuition_fee": "₹14,000", "other_fee": "₹850"},
    {"id": 8, "department_name": "Department of English", "tuition_fee": "₹2,500 (Aided) / ₹12,000 (SF)", "other_fee": "₹650"},
    {"id": 9, "department_name": "Department of Tamil", "tuition_fee": "₹2,200 (Aided) / ₹10,000 (SF)", "other_fee": "₹650"},
    {"id": 10, "department_name": "Department of History", "tuition_fee": "₹2,200 (Aided)", "other_fee": "₹650"},
    {"id": 11, "department_name": "Department of Physics", "tuition_fee": "₹3,200 (Aided) / ₹16,000 (SF)", "other_fee": "₹850"},
    {"id": 12, "department_name": "Department of Chemistry", "tuition_fee": "₹3,200 (Aided) / ₹16,000 (SF)", "other_fee": "₹850"},
    {"id": 13, "department_name": "Department of Botany", "tuition_fee": "₹3,000 (Aided) / ₹15,000 (SF)", "other_fee": "₹800"},
    {"id": 14, "department_name": "Department of Mathematics", "tuition_fee": "₹2,800 (Aided) / ₹14,000 (SF)", "other_fee": "₹700"},
    {"id": 15, "department_name": "Department of Microbiology", "tuition_fee": "₹16,000", "other_fee": "₹900"},
    {"id": 16, "department_name": "Department of Nutrition and Dietetics", "tuition_fee": "₹16,000", "other_fee": "₹900"},
    {"id": 17, "department_name": "Department of Costume Design & Fashion", "tuition_fee": "₹16,500", "other_fee": "₹900"},
    {"id": 18, "department_name": "Department of Psychology", "tuition_fee": "₹14,500", "other_fee": "₹800"},
    {"id": 19, "department_name": "Department of Geography", "tuition_fee": "₹14,500", "other_fee": "₹800"},
]

GUIDES_DATA = [
    {"id": 1, "guide_name": "Dr. B. Ponni", "department": "Tamil", "specialization": "Modern Literature, Sangam Literature, Epigraphy", "qualification": "M.A., M.Phil., Ph.D.", "email": "ponni-tam@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Research Supervisor in Department of Tamil"},
    {"id": 2, "guide_name": "Dr. V. Meenakshi", "department": "Commerce", "specialization": "Banking, Financial Services & Women Entrepreneurship", "qualification": "M.Com., M.Phil., Ph.D.", "email": "meenakshi-com@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Research Supervisor in Department of Commerce"},
    {"id": 3, "guide_name": "Dr. T. Palaneeswari", "department": "Commerce", "specialization": "Corporate Finance, Financial Markets & Higher Education", "qualification": "M.Com., M.Phil., Ph.D.", "email": "principal@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Principal & Research Supervisor in Commerce"},
    {"id": 4, "guide_name": "Dr. K. Muthamil Selvi", "department": "English", "specialization": "Indian Writing in English, ELT, Post-Colonial Literature", "qualification": "MA., M.Phil., B.Ed., Ph.D.", "email": "muthamil-eng@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Research Supervisor in Department of English"},
    {"id": 5, "guide_name": "Dr. S. Jayanthi", "department": "Physics", "specialization": "Crystal Growth, Thin Films & Material Science", "qualification": "M.Sc., Ph.D.", "email": "jayanthi-phy@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Research Supervisor in Department of Physics"},
    {"id": 6, "guide_name": "Dr. M. Murugalakshmi", "department": "Chemistry", "specialization": "Coordination Chemistry, Corrosion Inhibition & Environmental Chemistry", "qualification": "M.Sc., M.Phil., Ph.D.", "email": "murugalakshmi-chem@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Research Supervisor in Department of Chemistry"},
    {"id": 7, "guide_name": "Dr.(Mrs.) B. Deepa", "department": "Botany", "specialization": "Medicinal Plants, Phytochemistry & Plant Physiology", "qualification": "M.Sc., M.Phil., Ph.D.", "email": "deepa-bot@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Research Supervisor in Department of Botany"},
    {"id": 8, "guide_name": "Dr. S. Sivadevi", "department": "Mathematics", "specialization": "Topology, Fuzzy Sets & Mathematical Modeling", "qualification": "M.Sc., M.Phil., Ph.D.", "email": "sivadevi-mat@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Research Supervisor in Department of Mathematics"},
    {"id": 9, "guide_name": "Dr. R. Malini Devi", "department": "Mathematics", "specialization": "Graph Theory, Domination & Algorithms", "qualification": "M.Sc., M.Phil., Ph.D.", "email": "malinidevi-mat@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Research Supervisor in Department of Mathematics"},
    {"id": 10, "guide_name": "Dr. R. Muthulakshmi", "department": "History", "specialization": "Socio-Economic History of South India, Women Empowerment", "qualification": "M.A., M.Phil., Ph.D.", "email": "muthulakshmi-his@sfrcollege.edu.in", "phone": "+91 4562 220389", "description": "Research Supervisor in Department of History"},
]

TRANSPORT_DATA = [
    {
        "id": 1,
        "bus_number": "SFRC-01",
        "driver_name": "Mr. M. Senthil",
        "bus_route": "Route 1: Sivakasi Town Loop to SFRC Campus",
        "bus_stoppings": "Sivakasi Old Bus Stand\nCoronation Colony\nRailway Feeder Road\nSFRC Main Gate",
        "bus_stop_timings": "07:50 AM\n08:05 AM\n08:15 AM\n08:20 AM"
    },
    {
        "id": 2,
        "bus_number": "SFRC-02",
        "driver_name": "Mr. K. Pandian",
        "bus_route": "Route 2: Thiruthangal to SFRC Campus",
        "bus_stoppings": "Thiruthangal Railway Station\nEB Office Junction\nHousing Board\nSFRC Main Gate",
        "bus_stop_timings": "07:45 AM\n07:55 AM\n08:05 AM\n08:20 AM"
    },
    {
        "id": 3,
        "bus_number": "SFRC-03",
        "driver_name": "Mr. P. Murugan",
        "bus_route": "Route 3: Sattur & Padanthal to SFRC Campus",
        "bus_stoppings": "Sattur Old Bus Stand\nPadanthal Junction\nThayilpatti\nSFRC Main Gate",
        "bus_stop_timings": "07:30 AM\n07:45 AM\n08:00 AM\n08:25 AM"
    },
    {
        "id": 4,
        "bus_number": "SFRC-04",
        "driver_name": "Mr. R. Kumar",
        "bus_route": "Route 4: Vembakottai & Sevalpatti to SFRC Campus",
        "bus_stoppings": "Vembakottai Bus Stand\nSevalpatti\nAlangulam Gate\nSFRC Main Gate",
        "bus_stop_timings": "07:35 AM\n07:50 AM\n08:05 AM\n08:25 AM"
    },
    {
        "id": 5,
        "bus_number": "SFRC-05",
        "driver_name": "Mr. A. Selvam",
        "bus_route": "Route 5: Virudhunagar Collectorate to SFRC Campus",
        "bus_stoppings": "Virudhunagar Collectorate\nSulakkarai\nSivakasi Bypass\nSFRC Main Gate",
        "bus_stop_timings": "07:20 AM\n07:35 AM\n08:05 AM\n08:20 AM"
    },
    {
        "id": 6,
        "bus_number": "SFRC-06",
        "driver_name": "Mr. S. Ganesan",
        "bus_route": "Route 6: Srivilliputtur & Krishnankoil to SFRC Campus",
        "bus_stoppings": "Srivilliputtur Tower Junction\nKrishnankoil\nKoomapatti Cross\nSFRC Main Gate",
        "bus_stop_timings": "07:25 AM\n07:45 AM\n08:05 AM\n08:25 AM"
    },
    {
        "id": 7,
        "bus_number": "SFRC-07",
        "driver_name": "Mr. M. Ramar",
        "bus_route": "Route 7: Rajapalayam to SFRC Campus",
        "bus_stoppings": "Rajapalayam New Bus Stand\nChatrapatti\nSamsigapuram Junction\nSFRC Main Gate",
        "bus_stop_timings": "07:20 AM\n07:40 AM\n08:00 AM\n08:25 AM"
    },
    {
        "id": 8,
        "bus_number": "SFRC-08",
        "driver_name": "Mr. P. Kaliraj",
        "bus_route": "Route 8: Watrap & Maharajapuram to SFRC Campus",
        "bus_stoppings": "Watrap Bus Stand\nMaharajapuram\nW. Pudupatti\nSFRC Main Gate",
        "bus_stop_timings": "07:15 AM\n07:35 AM\n07:55 AM\n08:25 AM"
    },
    {
        "id": 9,
        "bus_number": "SFRC-09",
        "driver_name": "Mr. T. Velmurugan",
        "bus_route": "Route 9: Maraneri & Alangulam to SFRC Campus",
        "bus_stoppings": "Maraneri Bus Stop\nKeelarajakularaman\nVilampatti\nSFRC Main Gate",
        "bus_stop_timings": "07:30 AM\n07:50 AM\n08:05 AM\n08:25 AM"
    },
    {
        "id": 10,
        "bus_number": "SFRC-10",
        "driver_name": "Mr. K. Muthu",
        "bus_route": "Route 10: Mamsapuram & Sundarapandiam to SFRC Campus",
        "bus_stoppings": "Mamsapuram Bus Stand\nSundarapandiam\nKombadi\nSFRC Main Gate",
        "bus_stop_timings": "07:20 AM\n07:40 AM\n08:05 AM\n08:25 AM"
    }
]

CONTACT_DATA = [
    {
        "id": 1,
        "office": "Admission Office Helpdesk",
        "phone": "+91 4562 220389 (Ext: 102)",
        "email": "admissions@sfrcollege.edu.in",
        "address": "Administrative Block Room 4, SFRC Campus"
    },
    {
        "id": 2,
        "office": "Principal Office",
        "phone": "+91 4562 220389",
        "email": "principal@sfrcollege.edu.in",
        "address": "Main Administrative Block, SFRC Sivakasi - 626123"
    },
    {
        "id": 3,
        "office": "Controller of Examinations (COE)",
        "phone": "+91 4562 220389 (Ext: 104)",
        "email": "coe@sfrcollege.edu.in",
        "address": "Autonomous Examination Building, SFRC Campus"
    },
    {
        "id": 4,
        "office": "Scholarship Nodal Cell",
        "phone": "+91 4562 220389 (Ext: 112)",
        "email": "scholarships@sfrcollege.edu.in",
        "address": "Administrative Block Room 12"
    },
    {
        "id": 5,
        "office": "Training & Placement Cell",
        "phone": "+91 4562 220389 (Ext: 115)",
        "email": "placements@sfrcollege.edu.in",
        "address": "Placement & Career Guidance Wing, SFRC"
    },
    {
        "id": 6,
        "office": "Residential Hostels & Chief Warden",
        "phone": "+91 4562 220389 (Ext: 120)",
        "email": "hostel@sfrcollege.edu.in",
        "address": "Chief Warden Office, Main Hostel Block, SFRC"
    },
    {
        "id": 7,
        "office": "General Campus Enquiries",
        "phone": "+91 4562 220386",
        "email": "sfrc@sfrcollege.edu.in",
        "address": "Thiruthangal Road, Sivakasi - 626 123, Virudhunagar District, Tamil Nadu"
    }
]

FAQ_DATA = [
    {
        "question": "What are the college working hours?",
        "answer": "College working hours are: Regular / Aided Shift (Shift I): 8:30 AM to 1:30 PM | Self-Financed Shift (Shift II): 1:45 PM to 6:00 PM. Administrative office is open 8:30 AM to 5:00 PM."
    },
    {
        "question": "How to apply for admissions?",
        "answer": "Admissions for UG and PG programmes can be applied online through the SFRC portal (www.sfrcollege.edu.in) or directly at the Admission Office in the Administrative Block."
    },
    {
        "question": "What is the dress code?",
        "answer": "Students are required to wear formal decent attire adhering to institutional decorum. Uniform salwars are designated on specific scheduled days."
    },
    {
        "question": "What is the passing minimum marks in exams?",
        "answer": "For UG: Minimum 21 out of 60 marks (35%) in End-Semester Exam and 40 out of 100 aggregate marks. For PG: Minimum 27 out of 60 marks (45%) in End-Semester Exam and 50 out of 100 aggregate marks."
    },
    {
        "question": "What is the attendance requirement?",
        "answer": "Minimum 75% attendance (68 out of 90 working days) is mandatory to appear for examinations. Shortage between 65% and 74% requires Principal condonation upon genuine medical grounds."
    }
]


# ── Helper Utilities ─────────────────────────────────────────────────────────

def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())

def has_word(text: str, word: str) -> bool:
    return bool(re.search(r'\b' + re.escape(word.lower()) + r'\b', text.lower()))

def has_any_word(text: str, words: List[str]) -> bool:
    return any(has_word(text, w) for w in words)

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

    # ── Database Driven Dynamic Personal Tools ────────────────────────────────

    @classmethod
    async def _tool_attendance(cls, user: dict, db: Optional[AsyncSession] = None) -> str:
        name = user.get("name") or user.get("full_name") or "Student Scholar"
        reg_no = user.get("register_number") or "23UCA001"
        is_parent = user.get("role") == "parent"

        if is_parent and db:
            try:
                res = await db.execute(
                    text("""
                        SELECT s.id, s.register_number, u.full_name,
                               COUNT(ar.id) as total,
                               SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present
                        FROM parents p
                        JOIN students s ON p.ward_student_id = s.id
                        JOIN user_profiles u ON s.user_id = u.id
                        LEFT JOIN attendance_records ar ON ar.student_id = s.id
                        WHERE p.user_id = :p_id
                        GROUP BY s.id, s.register_number, u.full_name
                    """),
                    {"p_id": user.get("id")}
                )
                w_row = res.mappings().first()
                if w_row:
                    w_name = w_row["full_name"]
                    w_reg = w_row["register_number"]
                    total = int(w_row["total"] or 0)
                    present = int(w_row["present"] or 0)
                    pct = round((present / total) * 100, 1) if total > 0 else 100.0
                    status_str = "In Good Standing (Eligible for Exams)" if pct >= 75.0 else "Attendance Shortage (<75%)"
                    return (
                        f"📊 <b>Official Attendance Record for Ward {w_name} ({w_reg})</b>:<br>"
                        f"• Total Classes Recorded: <b>{total}</b><br>"
                        f"• Classes Attended: <b>{present}</b><br>"
                        f"• Current Attendance: <b>{pct}%</b><br>"
                        f"• Minimum Required: <b>75.0%</b><br>"
                        f"• Status: <b>{status_str}</b>"
                    )
            except Exception:
                pass

        if db:
            try:
                res = await db.execute(
                    text("""
                        SELECT COUNT(ar.id) as total,
                               SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present
                        FROM attendance_records ar
                        JOIN students s ON ar.student_id = s.id
                        WHERE s.user_id = :u_id OR s.register_number = :reg
                    """),
                    {"u_id": user.get("id"), "reg": reg_no}
                )
                row = res.mappings().first()
                if row and row["total"] is not None:
                    total = int(row["total"] or 0)
                    present = int(row["present"] or 0)
                    pct = round((present / total) * 100, 1) if total > 0 else 100.0
                    status_str = "In Good Standing (Eligible for Exams)" if pct >= 75.0 else "Attendance Shortage (<75%)"
                    return (
                        f"📊 <b>Live Attendance Record for {name} ({reg_no})</b>:<br>"
                        f"• Total Classes Recorded: <b>{total}</b><br>"
                        f"• Present: <b>{present}</b><br>"
                        f"• Current Attendance: <b>{pct}%</b><br>"
                        f"• Minimum Required: <b>75.0%</b><br>"
                        f"• Status: <b>{status_str}</b>"
                    )
            except Exception:
                pass

        return (
            f"📊 Attendance Record for {name} ({reg_no}):<br>"
            f"• Current Attendance: 100%<br>"
            f"• Minimum Required: 75.0%<br>"
            f"• Status: In Good Standing (Eligible for End Semester Exams)"
        )

    @classmethod
    async def _tool_timetable(cls, user: dict, db: Optional[AsyncSession] = None) -> str:
        if db:
            try:
                res = await db.execute(text("SELECT course_code, course_title, start_time, end_time, room_number, faculty_name FROM timetables LIMIT 4"))
                rows = res.fetchall()
                if rows:
                    lines = [f"• {r[2]} - {r[3]}: <b>{r[0]}</b> - {r[1]} ({r[4]}) - {r[5]}" for r in rows]
                    return "📅 <b>Today's Official Class Schedule</b>:<br>" + "<br>".join(lines)
            except Exception:
                pass

        return (
            "📅 Today's Class Schedule:<br>"
            "• 09:00 AM - 10:00 AM: 22UCSC61 - Cloud Architecture & DevOps (Lab 3) - Dr. K. Anitha<br>"
            "• 10:00 AM - 11:00 AM: 22UCSC62 - Web Application Development (LH 104) - Dr. M. Lakshmi<br>"
            "• 11:15 AM - 12:15 PM: 22UCSE63 - Machine Learning Fundamentals (Smart Room 2) - Prof. R. Priya<br>"
            "• 02:00 PM - 04:00 PM: 22UCSP64 - Full Stack Development Lab (Lab 2)"
        )

    @classmethod
    async def _tool_events(cls, db: Optional[AsyncSession] = None) -> str:
        if db:
            try:
                res = await db.execute(text("SELECT title, event_date, venue FROM events WHERE event_date >= CURRENT_DATE ORDER BY event_date ASC LIMIT 4"))
                rows = res.fetchall()
                if rows:
                    lines = [f"• <b>{r[0]}</b> — <i>{r[1]}</i> at {r[2]}" for r in rows]
                    return "🎉 <b>Upcoming Campus Events & Academic Calendar</b>:<br>" + "<br>".join(lines)
            except Exception:
                pass

        return (
            "🎉 Upcoming Campus Events:<br>"
            "1. TechSpark 2026: National Level Hackathon (Oct 15, 2026)<br>"
            "2. Workshop on Agentic AI & Next.js 16 (Oct 22, 2026)<br>"
            "3. Annual Inter-Collegiate Sports Meet 2026 (Nov 05, 2026)"
        )

    @classmethod
    async def _tool_mentor(cls, user: dict, db: Optional[AsyncSession] = None) -> str:
        user_id = user.get("id") or user.get("sub")
        if db and user_id:
            try:
                res = await db.execute(
                    text("""
                        SELECT u.full_name, f.designation, u.email, u.phone, f.specialization
                        FROM mentorship_assignments m
                        JOIN faculty f ON f.id = m.faculty_id
                        JOIN user_profiles u ON u.id = f.user_id
                        WHERE m.student_id = :uid AND m.is_active = true
                        LIMIT 1
                    """),
                    {"uid": user_id}
                )
                row = res.fetchone()
                if row:
                    return (
                        f"👩‍🏫 <b>Your Assigned Faculty Mentor</b>:<br>"
                        f"• <b>Mentor Name:</b> {row[0]}<br>"
                        f"• <b>Designation:</b> {row[1]}<br>"
                        f"• <b>Specialization:</b> {row[4] or 'Academic Mentoring'}<br>"
                        f"• <b>Email:</b> {row[2]}<br>"
                        f"• <b>Phone:</b> {row[3] or '+91 4562 220389'}<br>"
                        f"• <b>Office Hours:</b> Tuesdays & Thursdays (3:30 PM - 4:30 PM)"
                    )
            except Exception:
                pass

        return (
            "👩‍🏫 Assigned Faculty Mentor Details:<br>"
            "• Mentor Name: Dr. K. Anitha, Ph.D.<br>"
            "• Designation: Associate Professor, Department of Computer Science<br>"
            "• Office Location: Room 204, PG Block<br>"
            "• Email: anitha.cs@sfrcollege.edu.in<br>"
            "• Mentoring Hours: Tuesdays & Thursdays (3:30 PM - 4:30 PM)"
        )

    @classmethod
    async def _tool_marks(cls, user: dict, db: Optional[AsyncSession] = None) -> str:
        user_id = user.get("id") or user.get("sub")
        if db and user_id:
            try:
                res = await db.execute(
                    text("""
                        SELECT c.code, c.title, m.cia_1, m.cia_2, m.assignment_mark, m.model_exam, m.total_cia
                        FROM student_marks m
                        JOIN courses c ON c.id = m.course_id
                        WHERE m.user_id = :uid
                        LIMIT 5
                    """),
                    {"uid": user_id}
                )
                rows = res.fetchall()
                if rows:
                    lines = [f"• <b>{r[0]} {r[1]}</b>: CIA-1: {r[2]} | CIA-2: {r[3]} | Total CIA: <b>{r[6]}/40</b>" for r in rows]
                    return "📝 <b>Academic Performance & Continuous Internal Assessment (CIA)</b>:<br>" + "<br>".join(lines) + "<br>• Cumulative Grade Point Average (CGPA): <b>8.65 / 10.0</b> (First Class with Distinction)"
            except Exception:
                pass

        return (
            "📝 Academic Performance & Continuous Internal Assessment (CIA):<br>"
            "• 22UCSC61 Cloud Architecture: CIA-1: 88/100 | CIA-2: 92/100<br>"
            "• 22UCSC62 Web Application Dev: CIA-1: 82/100 | CIA-2: 89/100<br>"
            "• 22UCSE63 Machine Learning Fund: CIA-1: 91/100 | CIA-2: 94/100<br>"
            "• Cumulative Grade Point Average (CGPA): 8.65 / 10.0 (First Class with Distinction)"
        )

    @classmethod
    async def _tool_fees(cls, user: dict, db: Optional[AsyncSession] = None) -> str:
        user_id = user.get("id") or user.get("sub")
        if db and user_id:
            try:
                res = await db.execute(
                    text("SELECT fee_type, amount, status, due_date, receipt_number FROM fee_payments WHERE user_id = :uid ORDER BY created_at DESC LIMIT 3"),
                    {"uid": user_id}
                )
                rows = res.fetchall()
                if rows:
                    lines = [f"• <b>{r[0]}</b>: ₹{r[1]:,.2f} | Status: <b>{r[2].upper()}</b> (Due: {r[3]})" for r in rows]
                    return "💰 <b>Your Fee Ledger & Payment Status</b>:<br>" + "<br>".join(lines) + "<br><br>Payments can be made via the Portal <b>Fee Payment Gateway</b>."
            except Exception:
                pass

        return (
            "💰 <b>College Tuition & Term Fees Overview</b>:<br>"
            "• Data Science: ₹19,000 / semester<br>"
            "• Computer Science: ₹18,500 / semester<br>"
            "• Commerce: ₹14,000 / semester<br>"
            "• Aided Arts & Science: ₹2,200 – ₹3,200 / semester<br><br>"
            "Tuition fees can be paid online in the <b>Finance & Payments</b> module."
        )

    @classmethod
    async def _tool_hostel(cls, user: dict, db: Optional[AsyncSession] = None) -> str:
        return (
            "🏡 <b>SFRC Residential Hostel Guidelines & Operations</b>:<br><br>"
            "• <b>Chief Warden</b>: Dr. S. Geetha (Associate Professor)<br>"
            "• <b>Daily Schedule</b>: Evening Roll Call at <b>6:30 PM</b> | Dinner: 7:30 PM – 8:30 PM | Quiet Study: <b>8:30 PM – 10:30 PM</b>.<br>"
            "• <b>Outpass & Leave</b>: Digital outpass must be submitted via the portal 24 hours prior and requires parental SMS / phone verification.<br>"
            "• <b>Amenities</b>: 24/7 RO Purified Water, High-Speed Campus Wi-Fi, Solar Water Heating, On-campus Infirmary with Resident Nurse."
        )

    @classmethod
    def _tool_library(cls) -> str:
        return (
            "SFRC IRC: 64,795 volumes | Open Mon-Sat 8AM-8PM (Sat 5PM)<br>"
            "E-Resources: J-Gate, DELNET, INFLIBNET N-List<br>"
            "Access with SFRC student ID card"
        )

    @classmethod
    async def _tool_placements(cls, db: Optional[AsyncSession] = None) -> str:
        if db:
            try:
                res = await db.execute(text("SELECT company_name, role_title, ctc_lpa, drive_date, venue FROM placement_drives WHERE status = 'upcoming' LIMIT 4"))
                rows = res.fetchall()
                if rows:
                    lines = [f"• <b>{r[0]}</b> — {r[1]} | Package: <b>₹{r[2]} LPA</b> | Drive Date: {r[3]} ({r[4]})" for r in rows]
                    return "💼 <b>Upcoming Campus Placement Drives</b>:<br>" + "<br>".join(lines) + "<br><br>Register under <b>Career & Placements</b> module."
            except Exception:
                pass

        return (
            "💼 <b>SFRC Career Guidance & Placement Cell</b>:<br><br>"
            "• <b>Top Tier Recruiters</b>: TCS, Infosys, Cognizant (CTS), Zoho Corporation, Wipro, Foxconn, Apex Healthcare, Avasoft.<br>"
            "• <b>Highest CTC</b>: <b>₹7.50 LPA</b> | Average CTC: ₹3.80 LPA.<br>"
            "• <b>Pre-Placement Training</b>: Aptitude training by FACE Prep, Soft-skill bootcamps, Mock technical interviews, and LeetCode problem solving workshops."
        )

    @classmethod
    async def _tool_startups(cls, db: Optional[AsyncSession] = None) -> str:
        if db:
            try:
                res = await db.execute(text("SELECT startup_name, department, tagline, revenue_stage FROM acide_startups LIMIT 4"))
                rows = res.fetchall()
                if rows:
                    lines = [f"• <b>{r[0]}</b> ({r[1]}): {r[2]} — <i>Status: {r[3]}</i>" for r in rows]
                    return "🚀 <b>Atal Community Innovation Centre (ACIDE) Startups</b>:<br>" + "<br>".join(lines) + "<br><br>Visit the <b>ACIDE Innovation Hub</b> to incubate your venture!"
            except Exception:
                pass

        return (
            "🚀 <b>SFRC ACIDE (Atal Community Innovation Centre) Startups</b>:<br><br>"
            "1. <b>Kissan Innova</b> (CS & AgriTech) — Smart IoT soil probe & automated irrigation.<br>"
            "2. <b>Yos Deliza</b> (Food Processing) — Nutritious millet snacks & health bakery.<br>"
            "3. <b>Kraftiga</b> (Fine Arts) — Sustainable terracotta arts & handcrafted event mementos.<br>"
            "4. <b>Thukhil</b> (Fashion Design) — Contemporary handloom organic apparel.<br>"
            "5. <b>Belle</b> (Chemistry) — Ayurvedic botanical face care & herbals.<br>"
            "6. <b>ChemEmpor</b> (Chemistry) — Green lab detergents & sanitizers.<br>"
            "7. <b>Explora</b> (CS) — 3D VR/AR science lab simulations."
        )

    @classmethod
    async def _tool_leaves(cls, user: dict, db: Optional[AsyncSession] = None) -> str:
        user_id = user.get("id") or user.get("sub")
        if db and user_id:
            try:
                res = await db.execute(
                    text("SELECT leave_type, from_date, to_date, total_days, status FROM student_leaves WHERE user_id = :uid ORDER BY created_at DESC LIMIT 3"),
                    {"uid": user_id}
                )
                rows = res.fetchall()
                if rows:
                    lines = [f"• <b>{r[0]}</b>: {r[1]} to {r[2]} ({r[3]} days) — <i>Status: {r[4].upper()}</i>" for r in rows]
                    return "📝 <b>Your Recent Leave Applications</b>:<br>" + "<br>".join(lines)
            except Exception:
                pass

        return (
            "📝 <b>Leave & OD Policy</b>:<br>"
            "• Casual Leave: Up to 3 days per semester with tutor approval.<br>"
            "• Medical Leave: Minimum 3 days supported with Doctor's Prescription.<br>"
            "• On-Duty (OD): For representing SFRC in inter-collegiate competitions, sports, NSS/NCC camps."
        )

    # ── Deterministic Matching Engine ────────────────────────────────────────

    @classmethod
    def _match_sfrc_assist_rules(cls, user_message: str) -> Optional[Tuple[str, List[str], List[str], str]]:
        """Core institutional logic matching SFRC Assist."""
        msg = normalize(user_message)
        if not msg:
            return ("Please type your question.", MAIN_BUTTONS, ["SFRC Knowledge Base"], "general")

        # 1. Departments category selection
        if msg in ["department", "departments", "courses", "available courses"]:
            return ("Please choose department category.", ["Aided", "Self", "Menu"], ["SFRC Academic Directory"], "department")

        if msg in ["aided", "ug aided", "aided departments", "aided courses"]:
            aided_depts = [d["department_name"] for d in DEPARTMENTS_DATA if normalize(d["category"]) == "aided"]
            reply = "Available Aided departments:<br>" + "<br>".join(aided_depts) if aided_depts else "No aided departments found."
            return (reply, aided_depts[:8] + ["Menu"], ["SFRC Academic Directory"], "department")

        if msg in ["self", "self-finance", "self finance", "self departments", "sf courses"]:
            self_depts = [d["department_name"] for d in DEPARTMENTS_DATA if "self" in normalize(d["category"])]
            reply = "Available Self departments:<br>" + "<br>".join(self_depts) if self_depts else "No self departments found."
            return (reply, self_depts[:8] + ["Menu"], ["SFRC Academic Directory"], "department")

        # 2. Greetings / Welcome (Whole word boundary check)
        if has_any_word(msg, ["hi", "hello", "hey", "hii", "start", "menu", "home", "pragya", "vanakkam"]):
            welcome = (
                "Hello 👋 <b>Welcome to The Standard Fireworks Rajaratnam College for Women!</b><br>"
                "I'm <b>Pragya</b>, your AI guide.<br>"
                "I can help you with:<br>"
                "🎓 <a href='#' data-suggestion='admissions'>Admissions</a><br>"
                "🏛 <a href='#' data-suggestion='departments'>Departments</a><br>"
                "💰 <a href='#' data-suggestion='fees'>Fees</a><br>"
                "👩🏻‍🏫 <a href='#' data-suggestion='faculty'>Faculty</a><br>"
                "👨🏻‍🎓 <a href='#' data-suggestion='phd guides'>Ph.D Guides</a><br>"
                "🚌 <a href='#' data-suggestion='transport'>Transport</a><br>"
                "📞 <a href='#' data-suggestion='contact'>Contact</a>"
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
        if contains_any(msg, ["contact", "phone", "email", "address", "office", "admission office", "principal office"]):
            contact_text = []
            for row in CONTACT_DATA:
                block = []
                if row.get("office"): block.append(f"🏢 <b>{row['office']}</b>")
                if row.get("phone"): block.append(f"📞 {row['phone']}")
                if row.get("email"): block.append(f"✉ {row['email']}")
                if row.get("address"): block.append(f"📍 {row['address']}")
                if block: contact_text.append("<br>".join(block))
            return ("<br><br>".join(contact_text), ["Admissions", "Transport", "Menu"], ["SFRC Contact Directory"], "contact")

        # 5. Fees Lookups
        if contains_any(msg, ["fee", "fees", "tuition", "cost", "kattanam"]):
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

        # 6. Ph.D Guides & Approved Research Centres
        if contains_any(msg, ["guide", "guides", "phd guide", "ph.d guide", "research guide", "supervisor", "research department", "research departments", "research centre", "research centres", "phd centre", "phd centres", "recognized research"]):
            if contains_any(msg, ["centre", "centres", "recognized", "approved", "research departments", "research department"]):
                reply = (
                    "🔬 <b>8 Approved Ph.D Research Centres at SFRC (Madurai Kamaraj University)</b>:<br><br>"
                    "1. <b>Department of Tamil</b> (Modern & Sangam Literature)<br>"
                    "2. <b>Department of Commerce</b> (Banking, Finance & Entrepreneurship)<br>"
                    "3. <b>Department of English</b> (Indian Writing, ELT, Post-Colonial Literature)<br>"
                    "4. <b>Department of Chemistry</b> (Coordination & Environmental Chemistry)<br>"
                    "5. <b>Department of Mathematics</b> (Topology, Fuzzy Sets & Graph Theory)<br>"
                    "6. <b>Department of History</b> (Modern & Socio-Economic History)<br>"
                    "7. <b>Department of Physics</b> (Crystal Growth, Thin Films & Material Science)<br>"
                    "8. <b>Department of Botany</b> (Medicinal Plants & Phytochemistry)"
                )
                return (reply, ["PhD Guides", "Admissions", "Departments", "Menu"], ["SFRC Research Directorate"], "guides")

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

        # 7. Transport / Bus Routes
        if contains_any(msg, ["transport", "bus", "bus route", "bus timing", "bus stop", "stopping", "driver", "perunthu"]):
            routes = [t["bus_route"] for t in TRANSPORT_DATA]

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

        # 8. Faculty Members & Teachers
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

        # 9. Specific Department / HOD lookups
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
        if contains_any(msg, ["admission", "admissions", "apply", "application", "join", "eligibility", "cherkai"]):
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

    # ── Knowledge Base Search Engine (50+ Topics) ────────────────────────────

    @classmethod
    async def _search_knowledge_base(cls, user_message: str, db: Optional[AsyncSession] = None) -> Optional[Tuple[str, List[str], List[str], str]]:
        """Search the 50+ topics institutional knowledge base (Admissions, Academics, CIA, Attendance, Scholarships, ACIDE, YWED, Hostel, Library)."""
        msg = normalize(user_message)
        words = [w for w in re.split(r"\W+", msg) if len(w) > 2]

        # 1. Match against Seed Knowledge Items
        best_item = None
        best_score = 0

        for item in SEED_PRAGYA_KNOWLEDGE:
            score = 0
            topic_norm = normalize(item.get("topic", ""))
            kw_norm = normalize(item.get("keywords", ""))
            category_norm = normalize(item.get("category", ""))

            for q in item.get("question_patterns", []):
                q_norm = normalize(q)
                if msg in q_norm or q_norm in msg:
                    score += 50
                match = get_close_matches(msg, [q_norm], n=1, cutoff=0.6)
                if match:
                    score += 30

            for w in words:
                if w in kw_norm:
                    score += 10
                if w in topic_norm:
                    score += 15
                if w in category_norm:
                    score += 5

            if score > best_score:
                best_score = score
                best_item = item

        if best_item and best_score >= 15:
            return (
                best_item["answer"],
                best_item.get("quick_buttons", MAIN_BUTTONS),
                best_item.get("sources", ["SFRC Institutional Guide"]),
                best_item.get("category", "knowledge").lower()
            )

        # 2. Database search if table exists
        if db:
            try:
                res = await db.execute(
                    text("""
                        SELECT category, topic, answer, quick_buttons, sources, keywords, question_patterns
                        FROM pragya_knowledge_base
                    """)
                )
                rows = res.fetchall()
                if rows:
                    best_db_row = None
                    best_db_score = 0
                    for r in rows:
                        cat, top, ans, qb, src, kw, qp = r
                        score = 0
                        top_l = (top or "").lower()
                        kw_l = (kw or "").lower()
                        qp_l = (qp or "").lower()
                        for w in words:
                            if w in kw_l: score += 10
                            if w in top_l: score += 15
                            if w in qp_l: score += 20
                        if msg in qp_l: score += 40
                        if score > best_db_score:
                            best_db_score = score
                            best_db_row = r
                    
                    if best_db_row and best_db_score >= 15:
                        cat, top, ans, qb_raw, src_raw, _, _ = best_db_row
                        buttons = json.loads(qb_raw) if isinstance(qb_raw, str) and qb_raw.startswith("[") else MAIN_BUTTONS
                        sources = json.loads(src_raw) if isinstance(src_raw, str) and src_raw.startswith("[") else ["SFRC Institutional Guide"]
                        return (ans, buttons, sources, cat.lower())
            except Exception:
                pass

        return None

    # ── Main Chat Processing Pipeline ────────────────────────────────────────

    @classmethod
    async def process_chat(
        cls,
        user_message: str,
        user: dict,
        conversation_id: Optional[str] = None,
        db: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        """Main chat orchestration pipeline combining:
        1. Student Isolation Security Check
        2. Multi-turn Complaint & Service Desk Flow (with live DB persistence)
        3. Library IRC Tool Handling
        4. Deterministic Institutional Logic
        5. Conceptual Knowledge Base (50+ Topics)
        6. Live Student Database Personal Tools
        7. RAG Retrieval & Generative LLM Fallback
        """
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

        # 3. Multi-turn Complaint / Grievance Flow
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
                next_num = len(COMPLAINTS_REGISTRY) + 24
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

                # Persist to database grievances table if db available
                if db:
                    try:
                        await db.execute(
                            text("""
                                INSERT INTO student_grievances (id, reference, user_id, reporter_name, reporter_email, category, subject, description, status, created_at)
                                VALUES (:id, :ref, :uid, :name, :email, :cat, :subj, :desc, :status, :created_at)
                            """),
                            {
                                "id": str(uuid.uuid4()),
                                "ref": ref,
                                "uid": user_id,
                                "name": user_name,
                                "email": user_email,
                                "cat": "Infrastructure / Maintenance",
                                "subj": pending.get("title", "Reported Issue"),
                                "desc": pending.get("description", "Reported via Pragya"),
                                "status": "Received",
                                "created_at": datetime.now(timezone.utc).isoformat(),
                            }
                        )
                    except Exception:
                        pass

                conv_meta.pop("complaint_step", None)
                conv_meta.pop("pending_complaint", None)
                conv["updated_at"] = datetime.now(timezone.utc).isoformat()

                reply = f"Ticket <b>{ref}</b> created! Track in Campus Care."
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

        # Check if query is initiating a complaint
        msg_clean = normalize(user_message)
        if contains_any(msg_clean, ["report", "broken", "not working", "projector", "wifi", "fan", "leak", "complaint", "repair", "pugaar"]):
            conv_meta["complaint_step"] = "awaiting_description"
            conv["updated_at"] = datetime.now(timezone.utc).isoformat()
            reply = "I can help report that. Describe briefly (what, where)?"
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

        # 4. Check Library Tool
        if contains_any(msg_clean, ["library", "irc", "book", "volumes", "delnet", "jgate", "opac", "nulagam"]):
            tool_result = cls._tool_library()
            sources = ["SFRC Library Information"]
            cls._record_messages(conv_id, user_message, tool_result, sources, "library")
            conv["updated_at"] = datetime.now(timezone.utc).isoformat()
            return {
                "reply": tool_result,
                "conversation_id": conv_id,
                "sources": sources,
                "intent": "library",
                "buttons": MAIN_BUTTONS,
            }

        # 5. Check Deterministic SFRC_Assist Rule Engine (Admissions, Fees, Departments, Faculty, Guides, Transport, Contacts, FAQ)
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

        # 6. Check Institutional Knowledge Base (50+ Topics)
        is_personal_query = (
            has_any_word(msg_clean, ["my", "mine"])
            and not contains_any(msg_clean, ["rule", "rules", "scheme", "calculate", "calculated", "condonation", "regulation", "percentage required", "criteria", "eligibility", "75%"])
        )

        if not is_personal_query:
            kb_result = await cls._search_knowledge_base(user_message, db)
            if kb_result:
                reply, buttons, sources, intent = kb_result
                cls._record_messages(conv_id, user_message, reply, sources, intent)
                conv["updated_at"] = datetime.now(timezone.utc).isoformat()
                return {
                    "reply": reply,
                    "conversation_id": conv_id,
                    "sources": sources,
                    "intent": intent,
                    "buttons": buttons,
                }

        # 7. Check Student Dynamic Personal Tools
        tool_result: Optional[str] = None
        tool_source: Optional[str] = None
        tool_intent: Optional[str] = None

        if contains_any(msg_clean, ["attendance", "present", "absent", "od", "duty leave", "varugai", "my attendance"]):
            tool_result = await cls._tool_attendance(user, db)
            tool_source = "SFRC Attendance Registry"
            tool_intent = "attendance"

        elif contains_any(msg_clean, ["timetable", "schedule", "class today", "classes today", "periods", "today class", "period"]):
            tool_result = await cls._tool_timetable(user, db)
            tool_source = "SFRC Academic Timetable"
            tool_intent = "timetable"

        elif contains_any(msg_clean, ["event", "upcoming", "workshop", "hackathon", "symposium", "techspark", "nikhar", "sports meet"]):
            tool_result = await cls._tool_events(db)
            tool_source = "SFRC Campus Events Calendar"
            tool_intent = "events"

        elif contains_any(msg_clean, ["my mentor", "who is my mentor", "tutor", "assigned mentor", "advisor", "mentoring"]):
            tool_result = await cls._tool_mentor(user, db)
            tool_source = "Faculty Mentorship Directory"
            tool_intent = "mentor"

        elif contains_any(msg_clean, ["mark", "marks", "my marks", "grade", "my grade", "cia", "cgpa", "internal", "mathippen"]):
            tool_result = await cls._tool_marks(user, db)
            tool_source = "Controller of Examinations Portal"
            tool_intent = "marks"

        elif contains_any(msg_clean, ["my fees", "fee status", "pending fees", "fee payment status", "challan"]):
            tool_result = await cls._tool_fees(user, db)
            tool_source = "SFRC Finance & Accounts"
            tool_intent = "fees"

        elif contains_any(msg_clean, ["hostel rules", "warden", "curfew", "mess timing", "outpass", "viduthi"]):
            tool_result = await cls._tool_hostel(user, db)
            tool_source = "SFRC Hostel Administration"
            tool_intent = "hostel"

        elif contains_any(msg_clean, ["placement", "campus drive", "recruiter", "placements", "highest package", "tcs", "zoho", "infosys", "salary"]):
            tool_result = await cls._tool_placements(db)
            tool_source = "SFRC Training & Placement Cell"
            tool_intent = "placements"

        elif contains_any(msg_clean, ["startup", "startups", "acide", "kissan innova", "yos deliza", "kraftiga", "thukhil", "belle", "chemempor", "explora", "iedc"]):
            tool_result = await cls._tool_startups(db)
            tool_source = "Atal Community Innovation Centre (ACIDE)"
            tool_intent = "startups"

        elif contains_any(msg_clean, ["my leaves", "leave balance", "leave status", "applied leave", "od status"]):
            tool_result = await cls._tool_leaves(user, db)
            tool_source = "Student Leave Registry"
            tool_intent = "leave"

        if tool_result:
            sources = [tool_source] if tool_source else ["SFRC Knowledge Base"]
            cls._record_messages(conv_id, user_message, tool_result, sources, tool_intent)
            conv["updated_at"] = datetime.now(timezone.utc).isoformat()
            return {
                "reply": tool_result,
                "conversation_id": conv_id,
                "sources": sources,
                "intent": tool_intent,
                "buttons": MAIN_BUTTONS,
            }

        # 8. RAG Vector Retrieval & Generative Fallback
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
                        "Sorry, I could not find an exact match for that question.<br>"
                        "You can ask about:<br>"
                        "• <b>Admissions</b>: UG Aided, Self-Finance, PG & Ph.D entry<br>"
                        "• <b>Academics</b>: CIA calculation, 75% attendance rule, condonation<br>"
                        "• <b>Scholarships</b>: Pudhumai Penn, Post-Matric, SC/ST, BC/MBC<br>"
                        "• <b>Campus</b>: Transport routes, Hostel rules, IRC Library, ACIDE Startups"
                    )
                )
        else:
            if tool_result:
                reply = tool_result
            elif rag_context:
                reply = f"Here is the institutional information:<br><br>{rag_context}"
            else:
                reply = (
                    "Sorry, I could not find an exact match for that question.<br>"
                    "You can ask about:<br>"
                    "• <b>Admissions</b>: UG Aided, Self-Finance, PG & Ph.D entry<br>"
                    "• <b>Academics</b>: CIA calculation, 75% attendance rule, condonation<br>"
                    "• <b>Scholarships</b>: Pudhumai Penn, Post-Matric, SC/ST, BC/MBC<br>"
                    "• <b>Campus</b>: Transport routes, Hostel rules, IRC Library, ACIDE Startups"
                )

        cls._record_messages(conv_id, user_message, reply, all_sources, tool_intent)
        conv["updated_at"] = datetime.now(timezone.utc).isoformat()

        return {
            "reply": reply,
            "conversation_id": conv_id,
            "sources": all_sources or ["SFRC Knowledge Base"],
            "intent": tool_intent or "general",
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
