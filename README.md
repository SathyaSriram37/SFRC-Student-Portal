# 🏛️ MyZone – SFRC 360 & Pragya AI Digital Campus Platform

> **The Standard Fireworks Rajaratnam College for Women (Autonomous), Sivakasi**  
> *Affiliated to Madurai Kamaraj University | Re-accredited with 'A+' Grade by NAAC | College with Potential for Excellence by UGC | Mentor Institution under UGC PARAMARSH*

---

## 🌟 Overview

**MyZone SFRC 360** is a comprehensive, production-grade Smart Digital Campus SaaS platform built for **The Standard Fireworks Rajaratnam College for Women**. The system unifies academic governance, student self-service, faculty marks & attendance management, parent progress monitoring, administrative oversight, and **Pragya AI** — a live RAG-powered digital campus assistant.

---

## 🚀 Key Modules & Capabilities

### 1. 🎓 Student Self-Service Portal (`/student`)
- **Live Attendance Tracking**: Color-coded attendance percentages with minimum 75% examination eligibility alerts and duty leave logs.
- **Academic Timetable & Schedule**: Daily periods, room allocation, faculty course mapping, and lab schedules.
- **Continuous Internal Assessment (CIA) & Marks**: Real-time internal assessment marks, semester GPA, and cumulative CGPA tracking.
- **Campus Care (CivicFix)**: Multi-turn AI grievance reporting with automatic SLA countdown timers, category tagging, and status tracking.
- **E-Learning & E-Content Repository**: Unit-wise lecture notes, PDFs, syllabus downloads, and embedded multimedia lectures.
- **Placement, Alumni & IEDC**: Campus placement drives, interview preparation, alumni mentorship, and entrepreneurship cell events.
- **Transport & Facilities**: Interactive route directory, stop timings, driver contacts, and campus facility locator.

### 2. 👩🏻‍🏫 Faculty Portal (`/faculty`)
- **Real-Time Attendance Marking**: Session-by-session student attendance recording with automatic absentee alerts.
- **Marks Entry & CIA Submission**: Component-wise marks entry (CIA-1, CIA-2, Assignments, Model Exams) with auto-calculation.
- **Mentorship & Ward Management**: Student mentorship sessions recording, confidential mentoring notes, and mentee progress tracking.
- **E-Content Authoring**: Uploading and organizing study materials, past exam papers, and question banks.
- **Research & Publications**: Tracking publications, h-index, funded research projects, and conferences.

### 3. 👨‍👩‍👧 Parent Portal (`/parent`)
- **Ward Progress Tracking**: Granular academic performance, semester results, and subject-wise grades.
- **Attendance Monitoring**: Live alerts for low attendance or unexcused absences.
- **Hostel Guidelines & Outing Verification**: Digital leave requests, warden approvals, and curfew management.
- **College Notices & Events**: Circulars, exam schedules, fee reminders, and event notifications.

### 4. 🛡️ Administrative & Governance Portal (`/admin`)
- **Institutional Analytics**: Real-time KPI summary cards, student strength, faculty-to-student ratios, and department metrics.
- **User Management & RBAC**: Granular role-based access control with capability-aware permissions across all 4 roles.
- **IQAC & Accreditation**: NAAC, NIRF, and autonomous compliance metrics, SSR data points, and academic audit reports.
- **RAG Knowledge Base & Ingestion**: Managing institutional document ingestion, pgvector embeddings, and chunk indexing.
- **Audit Logs**: Immutable activity logging for security, compliance, and dispute resolution.

### 5. 🤖 Pragya AI Campus Digital Assistant
- **Exact Mascot & Blinking Animation**: Floating assistant with responsive dialog and interactive mascot animations.
- **Dual-Layer Knowledge Resolver**: Instant deterministic fuzzy matching for department directories, faculty info, fees, transport, and research guides + semantic pgvector RAG fallback.
- **Interactive Quick Action Chips**: Suggested next-step prompts and deep-linking into campus modules.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Web App** | Next.js 16 (Turbopack, App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend Services** | FastAPI, Python 3.12, Uvicorn, SQLAlchemy, Pydantic v2 |
| **Database & Vector Store** | PostgreSQL, Supabase, pgvector (Semantic Embeddings), Row-Level Security (RLS) |
| **AI & RAG Engine** | OpenAI / Gemini API, pgvector, LangChain / Custom chunking & ingestion pipeline |
| **Testing & Verification** | Playwright E2E testing, Pytest, Lighthouse Performance & Accessibility Audits |

---

## 📁 Repository Structure

```
SFRC-Student-Portal/
├── myzone-sfrc360/             # Next.js 16 Production Frontend Application
│   ├── app/                    # App Router (Student, Faculty, Parent, Admin portals)
│   ├── components/             # Reusable UI components, layout shell & Pragya AI Drawer
│   ├── lib/                    # Supabase client, API clients, authentication & hooks
│   └── public/                 # Static assets, branding logos, mascot animations & manifest
├── backend/                    # FastAPI High-Performance Backend Application
│   ├── app/
│   │   ├── ai/                 # Pragya AI Service, multi-turn resolver & providers
│   │   ├── api/                # REST API routers & endpoints (v1)
│   │   ├── core/               # Database engine, JWT authentication & audit logging
│   │   ├── models/             # SQLAlchemy ORM models & database schemas
│   │   ├── rag/                # Document chunking, embedding generation & retrieval
│   │   └── tests/              # Automated backend test suites
│   └── requirements.txt        # Python backend dependencies
├── SFRC_Assist/                # Standalone Institutional Assistant & Reference SQLite DB
├── Images/                     # College emblems, crests, and identity graphics
├── .gitignore                  # Git ignore rules for clean repository state
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started Locally

### 1. Frontend Setup (`myzone-sfrc360`)
```bash
cd myzone-sfrc360
npm install
npm run dev
```
*Frontend runs at `http://localhost:3000`*

### 2. Backend Setup (`backend`)
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # On Windows
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend API runs at `http://localhost:8000` with Swagger docs at `http://localhost:8000/docs`*

---

## 📄 License & Credits
Developed for **The Standard Fireworks Rajaratnam College for Women, Sivakasi**.  
All rights reserved © 2026.
