"""Comprehensive Institutional Knowledge Seeds for Pragya AI.
Extracted from:
1. Official SFRC Website (https://www.sfrcollege.edu.in/)
   - NAAC A+ Grade (4th Cycle, CGPA 3.42)
   - Autonomous status affiliated to Madurai Kamaraj University (MKU)
   - 3,436 Students, 160 Faculty, 19 Departments, 40 Programmes
   - Complete Autonomous CIA (40 marks) & ESE (60 marks) Evaluation Regulations
   - 75% Attendance & Condonation (65-74%) Tiers
   - Information Resource Centre (64,795 volumes, N-LIST, DELNET, J-Gate)
   - 3 Hostel Blocks (Chief Warden Dr. T. Palaneeswari)
   - ACIDE Incubation Centre, YWED Vocational Skills, Career Guidance & Placements
2. SFRC_Assist Knowledge Repository
   - Exact fee structures (Data Science ₹19,000+₹970, CS, Arts, Sciences)
   - Faculty emails and contacts (@sfrcollege.edu.in)
   - Ph.D Research Supervisors & Approved Centres
   - Dedicated bus routes and stops
"""
from __future__ import annotations

from typing import List, Dict, Any

SEED_PRAGYA_KNOWLEDGE: List[Dict[str, Any]] = [
    # ── 1. About College, Legacy & Accreditation ─────────────────────────────
    {
        "id": "about-sfrc-heritage",
        "category": "About SFRC",
        "topic": "About The Standard Fireworks Rajaratnam College for Women (SFRC)",
        "question_patterns": [
            "Tell me about SFRC college",
            "History and establishment of SFRC",
            "What is the NAAC accreditation grade of SFRC?",
            "Who founded SFRC college?",
            "sfrc pathi sollu",
            "college history"
        ],
        "answer": (
            "🏛 <b>The Standard Fireworks Rajaratnam College for Women (Autonomous), Sivakasi</b>:<br><br>"
            "• <b>Establishment</b>: Founded in <b>1968</b> by philanthropic pioneers <b>Thiru N.R.K. Rajaratnam</b> and <b>Tmt. R. Thamaraiammal</b> with the visionary motto: <i>'Empowerment of Women through Education'</i>.<br>"
            "• <b>Accreditation</b>: Re-accredited with prestigious <b>'A+' Grade by NAAC (4th Cycle)</b> with a Cumulative Grade Point Average (CGPA) of <b>3.42</b>.<br>"
            "• <b>Autonomy</b>: Conferred Autonomous status by UGC and Madurai Kamaraj University in 2005.<br>"
            "• <b>CPE Status</b>: Recognized as a <b>College with Potential for Excellence (CPE)</b> by UGC.<br>"
            "• <b>Campus Strength</b>: <b>3,436+ Students</b>, <b>160+ Qualified Faculty Members</b>, <b>19 Academic Departments</b>, and <b>40 Distinct Programmes</b>.<br>"
            "• <b>Location</b>: Thiruthangal Road, Sivakasi – 626 123, Virudhunagar District, Tamil Nadu."
        ),
        "quick_buttons": ["Programmes Offered", "Admissions", "Departments", "Contact"],
        "sources": ["SFRC Institutional Overview", "NAAC SSR 4th Cycle Report"],
        "keywords": "about history heritage naac a+ grade 1968 rajaratnam autonomy mku cpe sivakasi profile",
    },

    # ── 2. Academic Programmes (40 Programmes Overview) ──────────────────────
    {
        "id": "acad-programmes-overview",
        "category": "Admissions",
        "topic": "Overview of 40 Academic Programmes (UG, PG, Ph.D, Certificates)",
        "question_patterns": [
            "What courses are offered in SFRC?",
            "List all programmes available in SFRC",
            "How many UG and PG programmes are there?",
            "sfrc la enna enna course iruku",
            "available courses in college"
        ],
        "answer": (
            "🎓 <b>Academic Programmes Offered at SFRC (Total: 40 Programmes)</b>:<br><br>"
            "• <b>UG Aided (10 Courses)</b>: B.A. Tamil, B.A. English, B.A. History, B.Com., B.Com. (CA), B.Sc. Mathematics, B.Sc. Physics, B.Sc. Chemistry, B.Sc. Botany, B.Sc. Computer Science.<br>"
            "• <b>UG Self-Financed (12 Courses)</b>: B.Com., B.Com. (CA), B.Com. (Professional Accounting), B.B.A., B.Sc. Microbiology, B.Sc. Nutrition & Dietetics, B.Sc. Costume Design & Fashion, B.C.A., B.Sc. Computer Science, B.Sc. Psychology, B.Sc. Data Science, B.Sc. Geography.<br>"
            "• <b>PG Aided (3 Courses)</b>: M.A. English, M.Sc. Mathematics, M.Sc. Chemistry.<br>"
            "• <b>PG Self-Financed (10 Courses)</b>: M.A. Tamil, M.A. History, M.Com. (CA), M.Com. (Banking Technology), M.Com. (HRD), M.Sc. Physics, M.Sc. Botany, M.Sc. Microbiology, M.Sc. Computer Science, M.C.A. (AICTE Approved).<br>"
            "• <b>Ph.D Research (8 Centres)</b>: Tamil, Commerce, English, Chemistry, Mathematics, History, Physics, Botany.<br>"
            "• <b>Skill Development</b>: 27+ Career-Oriented Certificate and Diploma courses."
        ),
        "quick_buttons": ["UG Aided Courses", "UG Self-Finance Courses", "PG Courses", "Ph.D Research"],
        "sources": ["SFRC Academic Prospectus 2026", "Dean of Academic Affairs"],
        "keywords": "programmes courses 40 ug pg phd certificate aided self finance degree curriculum",
    },

    # ── 3. Undergraduate (UG) Aided Programmes ────────────────────────────────
    {
        "id": "adm-ug-aided",
        "category": "Admissions",
        "topic": "Undergraduate (UG) Aided Programmes & Eligibility",
        "question_patterns": [
            "How to apply for UG Aided courses?",
            "What are the Aided courses in SFRC?",
            "What is the eligibility for B.Sc / B.A Aided?",
            "Aided admission procedure",
            "aided courses details"
        ],
        "answer": (
            "🎓 <b>SFRC Undergraduate (UG) Aided Programmes</b>:<br><br>"
            "• <b>Arts & Humanities</b>: B.A. Tamil, B.A. English, B.A. History.<br>"
            "• <b>Commerce</b>: B.Com. (General), B.Com. (Computer Applications).<br>"
            "• <b>Sciences & Computing</b>: B.Sc. Mathematics, B.Sc. Physics, B.Sc. Chemistry, B.Sc. Botany, B.Sc. Computer Science.<br>"
            "• <b>Eligibility</b>: Pass in Higher Secondary Examination (+2) in relevant academic stream from a recognized board.<br>"
            "• <b>Fee Structure</b>: Highly subsidized government fees (approx. ₹2,200 to ₹3,200 per year) + minimal examination fees.<br>"
            "• <b>Government Reservation</b>: Fully adheres to Government of Tamil Nadu reservation policy (OC, BC, BCM, MBC/DNC, SC, SCA, ST)."
        ),
        "quick_buttons": ["Aided Courses", "Self-Finance Courses", "Fees", "Admissions Contact"],
        "sources": ["SFRC Admission Prospectus 2026", "Aided Programmes Handbook"],
        "keywords": "aided admission ug ba bsc tamil english maths physics chemistry botany eligibility",
    },

    # ── 4. Undergraduate (UG) Self-Financing Programmes ───────────────────────
    {
        "id": "adm-ug-sf",
        "category": "Admissions",
        "topic": "Undergraduate (UG) Self-Financing Programmes & Eligibility",
        "question_patterns": [
            "What are the Self-Finance courses in SFRC?",
            "How to apply for BCA or B.Sc Computer Science or Data Science?",
            "B.Com and BBA admission eligibility",
            "Self finance UG admissions",
            "sf courses list"
        ],
        "answer": (
            "🏛 <b>SFRC Undergraduate (UG) Self-Financing Programmes</b>:<br><br>"
            "• <b>Computing & Emerging Tech</b>: B.Sc. Computer Science, B.Sc. Data Science, B.C.A. (Bachelor of Computer Applications).<br>"
            "• <b>Commerce & Management</b>: B.Com. (General SF), B.Com. (Computer Applications SF), B.Com. (Professional Accounting - PA), B.B.A. (Business Administration).<br>"
            "• <b>Life Sciences & Applied Tech</b>: B.Sc. Microbiology, B.Sc. Nutrition & Dietetics, B.Sc. Costume Design & Fashion (CDF), B.Sc. Psychology, B.Sc. Geography.<br>"
            "• <b>Eligibility</b>: Pass in +2 with relevant subject combinations (Maths/CS/Commerce/Biology/Arts).<br>"
            "• <b>Key Highlights</b>: Industry-partnered syllabus, state-of-the-art computer labs, and skill certifications."
        ),
        "quick_buttons": ["Self-Finance Courses", "Fees", "Placements", "Contact"],
        "sources": ["SFRC Self-Financing Wing Guide", "Academic Handbook"],
        "keywords": "self finance sf bca bsc cs data science bcom bba nutrition commerce psychology cdf",
    },

    # ── 5. Postgraduate (PG) Programmes ──────────────────────────────────────
    {
        "id": "adm-pg",
        "category": "Admissions",
        "topic": "Postgraduate (PG) Programmes (Aided & Self-Financed)",
        "question_patterns": [
            "What PG courses are offered at SFRC?",
            "Eligibility for M.Sc Computer Science or Data Science or M.Com",
            "How to join M.A English or M.Sc Chemistry?",
            "PG admissions details",
            "mca course in sfrc"
        ],
        "answer": (
            "🎓 <b>SFRC Postgraduate (PG) Programmes</b>:<br><br>"
            "• <b>PG Aided Programmes</b>:<br>"
            "  - M.A. English Literature<br>"
            "  - M.Sc. Mathematics<br>"
            "  - M.Sc. Chemistry<br><br>"
            "• <b>PG Self-Financing Programmes</b>:<br>"
            "  - M.A. Tamil, M.A. History<br>"
            "  - M.Com. (Computer Applications), M.Com. (Banking Technology), M.Com. (Human Resource Development)<br>"
            "  - M.Sc. Physics, M.Sc. Botany, M.Sc. Microbiology, M.Sc. Computer Science<br>"
            "  - <b>M.C.A. (Master of Computer Applications)</b>: AICTE Approved, 2-year full-time programme.<br>"
            "• <b>Eligibility</b>: Bachelor's Degree in relevant discipline with minimum 50% aggregate (TANCET / College Entrance for MCA)."
        ),
        "quick_buttons": ["PG Courses", "Fees", "PhD Guides", "Admissions"],
        "sources": ["SFRC PG Studies Bulletin 2026", "AICTE Approval Order"],
        "keywords": "pg master msc mcom ma mca computer science data science chemistry english admission",
    },

    # ── 6. Ph.D Research Centres & Supervisors ────────────────────────────────
    {
        "id": "adm-phd",
        "category": "Research",
        "topic": "Doctoral (Ph.D) Research Programmes & Approved Centres",
        "question_patterns": [
            "How to apply for Ph.D in SFRC?",
            "What are the recognized research departments?",
            "PhD guides and research supervisors",
            "Doctoral admission eligibility",
            "research centres in sfrc"
        ],
        "answer": (
            "🔬 <b>Ph.D Research Programmes at SFRC</b>:<br><br>"
            "• <b>8 Approved Research Centres (Affiliated to Madurai Kamaraj University)</b>:<br>"
            "  1. <b>Department of Tamil</b> (Modern & Sangam Literature)<br>"
            "  2. <b>Department of Commerce</b> (Banking, Finance & Entrepreneurship)<br>"
            "  3. <b>Department of English</b> (Indian Writing, ELT, Gender Studies)<br>"
            "  4. <b>Department of Chemistry</b> (Coordination & Environmental Chemistry)<br>"
            "  5. <b>Department of Mathematics</b> (Topology, Graph Theory & Fuzzy Systems)<br>"
            "  6. <b>Department of History</b> (Modern & Socio-Economic History)<br>"
            "  7. <b>Department of Physics</b> (Crystal Growth, Thin Films & Nanotech)<br>"
            "  8. <b>Department of Botany</b> (Medicinal Plants & Phytochemistry)<br><br>"
            "• <b>Eligibility</b>: Master's Degree with minimum 55% marks + MKU Common Entrance Test or UGC-NET/CSIR-NET/SET/GATE qualification.<br>"
            "• <b>Research Facilities</b>: Central Instrumentation Facility, High-Speed Computing, DST-FIST & UGC supported laboratories."
        ),
        "quick_buttons": ["PhD Guides", "Research Facilities", "Faculty", "Contact"],
        "sources": ["SFRC Research Cell Bulletin", "MKU Ph.D Regulations"],
        "keywords": "phd doctor research guides supervisor mku entrance fellowship net set centres",
    },

    # ── 7. Certificate & Career-Oriented Courses (27+ Courses) ────────────────
    {
        "id": "prog-certificate-courses",
        "category": "Academics",
        "topic": "27+ Career-Oriented Certificate & Diploma Courses",
        "question_patterns": [
            "What certificate courses are available in SFRC?",
            "Diploma and skill development courses",
            "Can I do certificate courses along with degree?",
            "certificate courses list",
            "extra credit courses"
        ],
        "answer": (
            "📜 <b>SFRC Career-Oriented Certificate & Diploma Courses (27+ Courses)</b>:<br><br>"
            "Students can pursue these value-added courses parallel to their degree to earn extra credits and vocational competence:<br>"
            "• <b>Science & Industrial</b>: Pyrotechnic Chemistry, Forensic Science, Medical Laboratory Technology (DMLT), Solar Energy & LED Fabrication, Mushroom Culture & Vermitechnology, Bio-fertilizer Production, Herbal Botany.<br>"
            "• <b>Computing & Tech</b>: Data Analytics using R & Python, Web Designing & Multimedia, Cloud Computing & Cybersecurity, Desktop Publishing (DTP), Artificial Intelligence & ML Fundamentals.<br>"
            "• <b>Commerce & Management</b>: Accounting with Tally Prime, GST & Income Tax Filing, Banking & Financial Services, Tourism & Hospitality Management.<br>"
            "• <b>Arts, Design & Skills</b>: Fashion Designing & Garment Construction, Digital Photography, Beautician & Cosmetology, Yoga for Human Excellence, Communicative English, Translation Studies, Gandhian Thought, Women Entrepreneurship & Handicrafts.<br>"
            "• <b>Fee & Duration</b>: Nominal fee (₹500 - ₹2,000); 30 to 60 contact hours per semester."
        ),
        "quick_buttons": ["YWED Courses", "Programmes", "Fees", "Academic Calendar"],
        "sources": ["SFRC Skill Development Centre", "Curriculum Development Cell"],
        "keywords": "certificate diploma pyrotechnic forensic tally python dtp fashion yoga dmlt extra credit",
    },

    # ── 8. Autonomous CIA Examination Scheme ──────────────────────────────────
    {
        "id": "acad-cia-scheme",
        "category": "Academics",
        "topic": "Continuous Internal Assessment (CIA) Calculation Scheme",
        "question_patterns": [
            "How are CIA internal marks calculated?",
            "What is the CIA split for 40 marks?",
            "Internal mark calculation method",
            "How many CIA tests are conducted?",
            "cia internal marks split up",
            "internal marks epdi calculate panvanga"
        ],
        "answer": (
            "📝 <b>Continuous Internal Assessment (CIA) Scheme (40 Marks Total)</b>:<br><br>"
            "Under the Autonomous CBCS regulations, every theory course carries <b>40 Marks CIA</b> and <b>60 Marks End-Semester Exam (ESE)</b>:<br><br>"
            "• <b>1. Centralized Term Tests (25 Marks)</b>:<br>"
            "  - Two centralized term tests are conducted per semester (each for 60 marks, converted to 25).<br>"
            "  - Formula: Average of Test 1 and Test 2 = <b>25 Marks</b>.<br><br>"
            "• <b>2. Academic Quiz / Online MCQ (10 Marks)</b>:<br>"
            "  - Two online/offline objective assessments of 5 marks each = <b>10 Marks</b>.<br><br>"
            "• <b>3. Assignment / Seminar / Problem Solving (5 Marks)</b>:<br>"
            "  - In-depth analytical submission or seminar presentation = <b>5 Marks</b>.<br><br>"
            "• <b>Practical CIA (50 Marks)</b>: Experiments (30 marks) + Model Practical (15 marks) + Lab Record & Viva (5 marks)."
        ),
        "quick_buttons": ["Passing Minimum", "Check My Marks", "Attendance Rules", "Exams"],
        "sources": ["Autonomous Academic Handbook", "Office of Controller of Examinations"],
        "keywords": "cia internal marks calculation tests assignment quiz term test 40 25 10 5 practical 50",
    },

    # ── 9. Passing Minimum Marks & Autonomous Grading ────────────────────────
    {
        "id": "acad-passing-min",
        "category": "Academics",
        "topic": "Passing Minimum Marks & Grading System",
        "question_patterns": [
            "What is the passing minimum mark in semester exams?",
            "How many marks are needed to pass in UG and PG?",
            "Passing criteria for CIA and End Semester Exam",
            "pass mark evalo ug pg",
            "minimum mark to pass in sfrc"
        ],
        "answer": (
            "📊 <b>Autonomous Examination Passing Criteria & Credit Rules</b>:<br><br>"
            "• <b>Undergraduate (UG)</b>:<br>"
            "  - <b>End-Semester Exam (ESE)</b>: Minimum <b>35%</b> (i.e., <b>21 out of 60 marks</b>).<br>"
            "  - <b>Aggregate (CIA + ESE)</b>: Minimum <b>40%</b> (i.e., <b>40 out of 100 marks</b>).<br>"
            "  - <b>Practical Courses</b>: Minimum 20/50 in ESE and 40/100 aggregate.<br>"
            "  - <b>Total Credits Required</b>: Minimum <b>140 Credits</b> to qualify for degree award.<br><br>"
            "• <b>Postgraduate (PG) & MCA</b>:<br>"
            "  - <b>End-Semester Exam (ESE)</b>: Minimum <b>45%</b> (i.e., <b>27 out of 60 marks</b>).<br>"
            "  - <b>Aggregate (CIA + ESE)</b>: Minimum <b>50%</b> (i.e., <b>50 out of 100 marks</b>).<br>"
            "  - <b>Practical Courses</b>: Minimum 25/50 in ESE and 50/100 aggregate.<br>"
            "  - <b>Total Credits Required</b>: Minimum <b>90 Credits</b> (PG) / <b>120 Credits</b> (MCA)."
        ),
        "quick_buttons": ["CIA Scheme", "Attendance Rules", "Revaluation", "Exams"],
        "sources": ["SFRC Autonomous Examination Manual", "Controller of Examinations (COE)"],
        "keywords": "passing mark minimum pass ug pg percentage ese cia 40 50 21 27 credits 140 90 grade",
    },

    # ── 10. Mandatory 75% Attendance & Condonation Tiers ─────────────────────
    {
        "id": "acad-attendance-rule",
        "category": "Academics",
        "topic": "Mandatory 75% Attendance Regulation & 4 Condonation Tiers",
        "question_patterns": [
            "What is the minimum attendance percentage required?",
            "What happens if attendance is below 75%?",
            "Attendance condonation eligibility and rules",
            "Attendance requirement for semester exams",
            "attendance shortage rules condonation",
            "attendance 75 percentage illa na enna aagum"
        ],
        "answer": (
            "⏱ <b>SFRC Autonomous Attendance Regulations (90 Working Days / Semester)</b>:<br><br>"
            "• <b>Tier 1: 75% & Above (68 Days or more)</b>:<br>"
            "  - Eligible as Regular Candidate to appear for End-Semester Examinations in all registered courses.<br><br>"
            "• <b>Tier 2: 65% to 74% (59 to 67 Days) — Condonation Bracket</b>:<br>"
            "  - Shortage of attendance can be <b>condoned by the Principal</b> on genuine medical grounds, bereavement, or approved sports/OD representation.<br>"
            "  - Student must submit genuine Medical Certificate within 5 days of return + pay the MKU prescribed condonation fee.<br><br>"
            "• <b>Tier 3: 50% to 64% (45 to 58 Days) — Debarred Bracket</b>:<br>"
            "  - NOT permitted to write current semester examinations. Permitted to appear in subsequent semester after compensating attendance deficit.<br><br>"
            "• <b>Tier 4: Below 50% (Less than 45 Days) — Repeat Bracket</b>:<br>"
            "  - Student must repeat (re-do) the entire semester in the subsequent academic year."
        ),
        "quick_buttons": ["Check My Attendance", "Apply Condonation", "Leave Rules", "Academic Calendar"],
        "sources": ["SFRC Autonomous Academic Regulations", "Student Handbook"],
        "keywords": "attendance percentage rule 75 condonation 65 shortage 50 debarred repeat medical days",
    },

    # ── 11. Attendance Condonation Application Workflow ───────────────────────
    {
        "id": "acad-condonation-process",
        "category": "Academics",
        "topic": "Attendance Condonation Application Procedure & Deadlines",
        "question_patterns": [
            "How to apply for attendance condonation?",
            "Condonation fee and medical proof submission",
            "When to apply for condonation?",
            "condonation application process"
        ],
        "answer": (
            "📝 <b>Attendance Condonation Application Procedure</b>:<br><br>"
            "1. <b>Eligibility Verification</b>: Ensure semester attendance is strictly between <b>65.0% and 74.9%</b>.<br>"
            "2. <b>Application Form</b>: Obtain Condonation Proforma from the College Office or apply via the Student Portal under Academics.<br>"
            "3. <b>Document Enclosures</b>:<br>"
            "   - Original Medical Certificate issued by a Registered Medical Practitioner (RMP) or approved On-Duty (OD) authorization letters.<br>"
            "   - Leave letters endorsed by parents and faculty mentor.<br>"
            "4. <b>Verification & Forwarding</b>: Recommendation by Faculty Mentor and Department HOD.<br>"
            "5. <b>Principal Approval & Fee Payment</b>: Approval granted by the Principal. Pay the university prescribed condonation fee at the college bank counter or online portal before COE cutoff date."
        ),
        "quick_buttons": ["Check My Attendance", "Attendance Rules", "Contact HOD", "Portal Help"],
        "sources": ["Controller of Examinations (COE) Circular", "Academic Section"],
        "keywords": "apply condonation medical certificate od proof deadline principal approval fee",
    },

    # ── 12. Central Library (Information Resource Centre - IRC) ──────────────
    {
        "id": "lib-irc-resources",
        "category": "Library",
        "topic": "Central Library (Information Resource Centre) Catalog & E-Resources",
        "question_patterns": [
            "What are the library timings?",
            "What e-resources and journals are available in library?",
            "How many books can a student borrow?",
            "Library membership and rules",
            "sfrc library details volumes books"
        ],
        "answer": (
            "📚 <b>SFRC Information Resource Centre (Central Library)</b>:<br><br>"
            "• <b>Timings</b>: Working Days: <b>8:30 AM to 5:30 PM</b> | Saturdays: <b>9:00 AM to 4:00 PM</b>.<br>"
            "• <b>Print Resources</b>: Over <b>64,795 Volumes</b>, 105 Print Journals & Periodicals, 12,000+ Reference Titles, and Institutional Theses Repository.<br>"
            "• <b>Digital Library & E-Resources</b>:<br>"
            "  - <b>INFLIBNET N-LIST</b>: 6,000+ e-journals and 1,95,000+ e-books.<br>"
            "  - <b>DELNET (Developing Library Network)</b>: Inter-library loan and document delivery.<br>"
            "  - <b>J-Gate Discovery Platform</b>: Indexed research literature in Sciences & Social Sciences.<br>"
            "  - <b>National Digital Library of India (NDLI)</b> Institutional Club.<br>"
            "• <b>Automation & Infrastructure</b>: Fully automated with Barcode & RFID circulation, OPAC Web Kiosks, and an air-conditioned digital laboratory with 40 high-speed computers.<br>"
            "• <b>Borrowing Quota</b>: UG Students: 3 Books (14 days) | PG Students: 5 Books (21 days) | Ph.D Scholars: 8 Books (30 days)."
        ),
        "quick_buttons": ["Search Library Books", "E-Content Hub", "Library Rules", "Campus Facilities"],
        "sources": ["SFRC Information Resource Centre Manual", "Librarian Report"],
        "keywords": "library irc 64795 books volumes nlist delnet jgate timing opac rfid borrow digital",
    },

    # ── 13. Residential Hostel Blocks & Living Regulations ───────────────────
    {
        "id": "hostel-living-guide",
        "category": "Hostel",
        "topic": "Residential Hostels (3 Blocks), Dining & Outpass Regulations",
        "question_patterns": [
            "What are the hostel facilities in SFRC?",
            "Hostel mess menu and study hours",
            "How to apply for hostel outpass?",
            "Hostel rules and chief warden contact",
            "hostel fee details viduthi"
        ],
        "answer": (
            "🏡 <b>SFRC Residential Hostels (3 Blocks)</b>:<br><br>"
            "• <b>Residential Blocks</b>: <b>Main Hostel Block</b>, <b>Diamond Jubilee Block</b>, and <b>Golden Jubilee Block</b> accommodating over 1,200 girl students.<br>"
            "• <b>Chief Warden</b>: <b>Dr. T. Palaneeswari</b> (Principal & Ex-officio Chief Warden), assisted by resident Deputy Wardens and tutors.<br>"
            "• <b>Amenities</b>: Spacious furnished rooms, 24/7 RO purified drinking water plants, solar water heaters, uninterrupted power backup with generator, study halls, recreation hall with indoor games, and high-speed Wi-Fi.<br>"
            "• <b>Health Care</b>: Resident Health Clinic with qualified nurse and visiting doctor.<br>"
            "• <b>Mess & Dining</b>: Hygienic modern kitchen with steam cooking serving nutritious vegetarian and non-vegetarian food.<br>"
            "• <b>Study Hours</b>: Mandatory silent study hours between <b>8:30 PM and 10:30 PM</b>.<br>"
            "• <b>Digital Outpass</b>: Applied through the Student Portal with mandatory parent SMS/phone verification before exit."
        ),
        "quick_buttons": ["Apply Outpass", "Hostel Dues", "Campus Care", "Contact Warden"],
        "sources": ["SFRC Hostel Administration Rules", "Chief Warden Office"],
        "keywords": "hostel residential blocks mess food timings study hours outpass palaneeswari warden",
    },

    # ── 14. College Dedicated Bus Transport Fleet ─────────────────────────────
    {
        "id": "trans-routes-guide",
        "category": "Transport",
        "topic": "College Bus Network, Timings, Driver Contacts & Route Coverage",
        "question_patterns": [
            "What are the college bus routes and stops?",
            "Bus timing to Sattur, Rajapalayam, Srivilliputhur, Thiruthangal",
            "How to get college bus pass?",
            "Transport network details",
            "college bus timings bus route list"
        ],
        "answer": (
            "🚌 <b>SFRC Dedicated Bus Transport Fleet (25+ Buses Across 11 Major Routes)</b>:<br><br>"
            "• <b>Route 1 (Sivakasi Town)</b>: Sivakasi Old Bus Stand (07:50 AM) ➔ Coronation Colony (08:05 AM) ➔ SFRC (08:20 AM). Driver: Mr. M. Senthil (+91 98421 11001).<br>"
            "• <b>Route 2 (Thiruthangal)</b>: Thiruthangal Railway Station (07:45 AM) ➔ Housing Board (08:00 AM) ➔ SFRC (08:20 AM). Driver: Mr. K. Pandian (+91 98421 11002).<br>"
            "• <b>Route 3 (Sattur)</b>: Sattur Bus Stand (07:30 AM) ➔ Padanthal (07:45 AM) ➔ Thayilpatti (08:00 AM) ➔ SFRC (08:25 AM). Driver: Mr. P. Murugan (+91 98421 11003).<br>"
            "• <b>Route 4 (Vembakottai)</b>: Vembakottai (07:35 AM) ➔ Sevalpatti (07:55 AM) ➔ SFRC (08:25 AM). Driver: Mr. R. Kumar (+91 98421 11004).<br>"
            "• <b>Route 5 (Virudhunagar)</b>: Virudhunagar Collectorate (07:20 AM) ➔ Sulakkarai (07:35 AM) ➔ SFRC (08:20 AM). Driver: Mr. A. Selvam (+91 98421 11005).<br>"
            "• <b>Route 6 (Srivilliputtur)</b>: Srivilliputtur Tower (07:25 AM) ➔ Krishnankoil (07:45 AM) ➔ SFRC (08:25 AM). Driver: Mr. S. Ganesan (+91 98421 11006).<br>"
            "• <b>Route 7 (Rajapalayam)</b>: Rajapalayam New Bus Stand (07:20 AM) ➔ Chatrapatti (07:40 AM) ➔ SFRC (08:25 AM). Driver: Mr. M. Ramar (+91 98421 11007).<br>"
            "• <b>Safety Features</b>: GPS tracking on all buses, emergency panic buttons, and speed governors.<br>"
            "• <b>Bus Pass</b>: Apply or renew online via the Student Portal under Transport module."
        ),
        "quick_buttons": ["View Bus Routes", "Transport Fees", "Bus In-charge", "Campus Facilities"],
        "sources": ["SFRC Transport Directorate", "Transport Manager Circular"],
        "keywords": "transport bus routes timing sattur rajapalayam srivilliputtur thiruthangal virudhunagar gps pass",
    },

    # ── 15. Fee Structure for All Streams ─────────────────────────────────────
    {
        "id": "fees-all-programmes",
        "category": "Fees",
        "topic": "Fee Structure for UG Aided, UG SF, PG & Professional Programmes",
        "question_patterns": [
            "What is the fee structure in SFRC?",
            "How much is the fees for Data Science, Computer Science, B.Com?",
            "Tuition fee details for aided and self-finance",
            "college fees evalo",
            "fees details for courses"
        ],
        "answer": (
            "💰 <b>SFRC Indicative Fee Structure per Academic Year / Semester</b>:<br><br>"
            "• <b>UG Aided Programmes (Government Subsidized / Annual)</b>:<br>"
            "  - B.A. Tamil: Tuition ₹2,200 + Other Fee ₹650<br>"
            "  - B.A. English: Tuition ₹2,500 + Other Fee ₹650<br>"
            "  - B.Sc. Mathematics: Tuition ₹2,800 + Other Fee ₹700<br>"
            "  - B.Sc. Physics: Tuition ₹3,200 + Other Fee ₹850<br>"
            "  - B.Sc. Chemistry: Tuition ₹3,200 + Other Fee ₹850<br>"
            "  - B.Sc. Botany: Tuition ₹3,000 + Other Fee ₹800<br>"
            "  - B.Sc. Computer Science (Aided): Tuition ₹3,500 + Other Fee ₹950<br><br>"
            "• <b>UG Self-Financed Programmes (Per Semester)</b>:<br>"
            "  - B.Sc. Data Science: Tuition <b>₹19,000</b> + Other Fee <b>₹970</b><br>"
            "  - B.Sc. Computer Science (SF): Tuition <b>₹18,500</b> + Other Fee <b>₹950</b><br>"
            "  - B.C.A. (Computer Applications): Tuition <b>₹18,000</b> + Other Fee <b>₹900</b><br>"
            "  - B.Com. (SF) / B.Com. (CA) / B.Com. (PA) / B.B.A.: Tuition <b>₹14,000</b> + Other Fee <b>₹850</b><br>"
            "  - B.Sc. Microbiology / Nutrition & Dietetics: Tuition <b>₹16,000</b> + Other Fee <b>₹900</b><br>"
            "  - B.Sc. Costume Design & Fashion (CDF): Tuition <b>₹16,500</b> + Other Fee <b>₹900</b><br>"
            "  - B.Sc. Psychology / Geography: Tuition <b>₹14,500</b> + Other Fee <b>₹800</b><br><br>"
            "• <b>PG Programmes</b>:<br>"
            "  - PG Aided: Approx. ₹3,500 – ₹4,500 per year<br>"
            "  - PG SF (M.Sc. CS / Data Science / MCA): ₹22,000 – ₹25,000 per semester<br>"
            "  - PG SF (M.Com. / M.A.): ₹12,000 – ₹15,000 per semester"
        ),
        "quick_buttons": ["Check My Fee Dues", "Pay Fees Online", "Scholarships", "Admissions"],
        "sources": ["SFRC Finance & Accounts Bulletin", "Admission Prospectus"],
        "keywords": "fee fees tuition other fee cost data science computer science bcom bca physics chemistry kattanam",
    },

    # ── 16. Moovalur Ramamirtham Ammaiyar Pudhumai Penn Scheme ────────────────
    {
        "id": "sch-pudhumai-penn",
        "category": "Scholarships",
        "topic": "Moovalur Ramamirtham Ammaiyar Pudhumai Penn Scheme (₹1,000/Month)",
        "question_patterns": [
            "What is Pudhumai Penn scholarship scheme?",
            "Who is eligible for Rs 1000 monthly scheme for girl students?",
            "How to apply for Moovalur Ramamirtham scheme?",
            "pudhumai penn scholarship eligibility",
            "1000 rupees girl student scholarship"
        ],
        "answer": (
            "🌸 <b>Moovalur Ramamirtham Ammaiyar 'Pudhumai Penn' Scheme</b>:<br><br>"
            "• <b>Benefit</b>: <b>₹1,000 per month</b> deposited directly into the student's bank account via Direct Benefit Transfer (DBT) until degree completion.<br>"
            "• <b>Eligibility Criteria</b>:<br>"
            "  - Female students who studied in <b>Government Schools from Class 6 to Class 12 in Tamil Nadu</b>.<br>"
            "  - Currently enrolled in full-time Undergraduate degree or Diploma programmes at SFRC.<br>"
            "• <b>Application Process</b>: Handled through the College Scholarship Nodal Officer.<br>"
            "• <b>Required Documents</b>: EMIS Number, School Transfer Certificate (TC) proving govt school study from 6th to 12th, 10th & 12th marksheets, Aadhaar Card, and active Aadhaar-linked Savings Bank Account passbook."
        ),
        "quick_buttons": ["Government Scholarships", "Scholarship Desk", "Fees", "Contact"],
        "sources": ["Higher Education Department, Govt of Tamil Nadu", "SFRC Scholarship Nodal Cell"],
        "keywords": "pudhumai penn 1000 moovalur ramamirtham govt school girl student dbt scholarship dbt emis",
    },

    # ── 17. Government BC / MBC / DNC & SC / ST Scholarships ───────────────────
    {
        "id": "sch-gov-schemes",
        "category": "Scholarships",
        "topic": "Government BC / MBC / DNC & SC / ST Post-Matric Welfare Scholarships",
        "question_patterns": [
            "What government scholarships can I apply for?",
            "BC MBC scholarship eligibility and income limit",
            "SC ST scholarship benefits and renewal",
            "State govt scholarship schemes",
            "post matric scholarship apply"
        ],
        "answer": (
            "🏛 <b>Government Welfare Scholarships Available at SFRC</b>:<br><br>"
            "1. <b>BC / MBC / DNC Welfare Scholarship</b>:<br>"
            "   - Annual parental income limit: Up to <b>₹2,00,000</b>.<br>"
            "   - Reimburses tuition fee, special fees, and examination fees.<br><br>"
            "2. <b>SC / ST / SCA Post-Matric Scholarship</b>:<br>"
            "   - Annual parental income limit: Up to <b>₹2,50,000</b>.<br>"
            "   - 100% full tuition fee exemption and monthly maintenance allowance.<br><br>"
            "3. <b>Chief Minister's Higher Education Special Scholarship</b>:<br>"
            "   - <b>₹8,000 per annum</b> for SC/ST students staying in college recognized hostels.<br><br>"
            "4. <b>Minority Scholarship</b>:<br>"
            "   - Central / State scholarship for Muslim, Christian, and Jain students securing above 50% marks with parental income below ₹2.5 Lakhs.<br><br>"
            "5. <b>Application Portal</b>: Apply online on the Tamil Nadu TN-eDistrict / NSP Portal and submit printed forms to College Scholarship Room 12."
        ),
        "quick_buttons": ["Pudhumai Penn", "Management Concessions", "Fees", "Scholarship Desk"],
        "sources": ["Tamil Nadu Welfare Department", "SFRC Nodal Officer"],
        "keywords": "bc mbc dnc sc st post matric minority chief minister income limit scholarship nsp",
    },

    # ── 18. Incubation Centre (ACIDE) & Student Startups ──────────────────────
    {
        "id": "acide-startup-hub",
        "category": "Innovation",
        "topic": "Atal Community Innovation Centre (ACIDE) & Student Startups",
        "question_patterns": [
            "What is ACIDE incubation centre?",
            "How can a student start a startup in SFRC?",
            "Seed funding for student innovative projects",
            "IEDC and MSME patent support",
            "student startups in college"
        ],
        "answer": (
            "🚀 <b>Atal Community Innovation Centre (ACIDE) & IEDC Innovation Hub</b>:<br><br>"
            "• <b>Mandate</b>: Catalyzing women entrepreneurship, rural innovations, and tech product startups from student ideas to registered enterprises.<br>"
            "• <b>Facilities</b>: Co-working incubator spaces, rapid fabrication prototyping lab, IoT testbeds, high-speed computing, and legal/patent assistance.<br>"
            "• <b>Funding Support</b>:<br>"
            "  - <b>Prototype Grants</b>: Up to <b>₹50,000</b> for proof-of-concept under IEDC (DST).<br>"
            "  - <b>Seed Grant Assistance</b>: Up to <b>₹5,00,000</b> for viable early-stage student ventures under MSME & State Startup schemes.<br>"
            "• <b>Active Student Startups</b>:<br>"
            "  - <i>Kissan Innova</i> (Agri-tech automated crop monitoring)<br>"
            "  - <i>Kraftiga</i> (Eco-friendly bio-packaging and craft enterprise)<br>"
            "  - <i>ChemEmpor</i> (Laboratory green chemical synthesis)<br>"
            "  - <i>Explora</i> (AI & Educational STEM kits)<br>"
            "  - <i>Thukhil</i> (Sustainable organic apparel and natural dyes)<br>"
            "  - <i>Yos Deliza</i> (Nutritious millet-based confectioneries)<br>"
            "  - <i>Belle</i> (Handmade herbal cosmetics & skin-care)"
        ),
        "quick_buttons": ["View Startups", "Apply Incubation", "YWED Courses", "Research Hub"],
        "sources": ["ACIDE Incubation Brochure", "IEDC Project Cell"],
        "keywords": "acide startup innovation incubation iedc seed funding prototype grant patent kissan kraftiga",
    },

    # ── 19. YWED (Young Women Entrepreneurship Development Centre) ───────────
    {
        "id": "ywed-vocational-skills",
        "category": "Innovation",
        "topic": "YWED (Young Women Entrepreneurship Development) Vocational Courses",
        "question_patterns": [
            "What are YWED courses in SFRC?",
            "Vocational skill training certificate programmes",
            "How to enroll in YWED courses?",
            "tailoring cosmetics jewellery making in college"
        ],
        "answer": (
            "🧵 <b>YWED (Young Women Entrepreneurship Development Centre)</b>:<br><br>"
            "• <b>Objective</b>: Empowering every woman student with practical, commercial, self-employment and entrepreneurial skill sets before graduation.<br>"
            "• <b>Hands-on Courses Offered</b>:<br>"
            "  - Hand Embroidery, Fashion Tailoring & Garment Construction<br>"
            "  - Herbal Cosmetics Formulation & Natural Soaps<br>"
            "  - Food Processing, Bakery & Millet Confectionery<br>"
            "  - Terracotta & Fashion Jewellery Making<br>"
            "  - Terrace Organic Gardening & Vermiculture<br>"
            "  - Digital Content Marketing & E-Commerce Store Setup<br>"
            "• <b>Kala Mela Product Exhibition</b>: Students create and sell their finished products during the annual college campus trade fair.<br>"
            "• <b>Eligibility</b>: Open to all UG & PG students with authorized institutional certificates."
        ),
        "quick_buttons": ["YWED Courses", "ACIDE Startups", "Student Life", "Contact"],
        "sources": ["YWED Centre Annual Handbook", "Entrepreneurship Development Cell"],
        "keywords": "ywed vocational skill courses tailoring cosmetics food processing certificate jewellery",
    },

    # ── 20. Career Guidance & Placement Cell ──────────────────────────────────
    {
        "id": "place-corporate-drives",
        "category": "Placements",
        "topic": "Placement Training, Top Recruiters & Campus Drive Package",
        "question_patterns": [
            "What companies visit SFRC for campus placements?",
            "Placement training and eligibility criteria",
            "Highest CTC package and placement percentage",
            "Placement drive schedule",
            "campus interview companies"
        ],
        "answer": (
            "💼 <b>SFRC Career Guidance & Placement Cell</b>:<br><br>"
            "• <b>Top Corporate Recruiters</b>: Tata Consultancy Services (TCS), Cognizant (CTS), Infosys, Wipro, Zoho Corporation, Deloitte, HCL Technologies, Accenture, Capegemini, Foxconn, Sutherland Global, Muthoot Finance, Axis Bank, ICICI Bank, Aravind Eye Hospital.<br>"
            "• <b>Salary Packages</b>: Range from <b>₹2.80 LPA to ₹6.50 LPA</b>.<br>"
            "• <b>Comprehensive Training</b>:<br>"
            "  - Full-stack coding & Python programming bootcamps.<br>"
            "  - Quantitative Aptitude and Logical Reasoning drills.<br>"
            "  - Mock Group Discussions (GD) and technical HR interviews.<br>"
            "  - Soft Skills, Communicative English, and Corporate Etiquette training.<br>"
            "• <b>Drive Applications</b>: View and apply for upcoming campus drives under <b>Dashboard > Placements</b>."
        ),
        "quick_buttons": ["View Placement Drives", "My Applications", "Resume Review", "Placements"],
        "sources": ["SFRC Career Guidance and Placement Cell Report 2026"],
        "keywords": "placement jobs companies tcs cognizant zoho wipro infosys salary ctc drives interview",
    },

    # ── 21. Campus Facilities & Smart Infrastructure ──────────────────────────
    {
        "id": "campus-infrastructure",
        "category": "Campus Facilities",
        "topic": "Campus Facilities: Smart Classrooms, Labs, RO Plants, Solar & Sports",
        "question_patterns": [
            "What facilities are available on campus?",
            "Smart classrooms and laboratory facilities",
            "Sports facilities and gymnasium",
            "Drinking water and solar power in SFRC",
            "campus amenities"
        ],
        "answer": (
            "🏛 <b>SFRC Campus Infrastructure & Modern Amenities</b>:<br><br>"
            "• <b>Smart Classrooms</b>: 60+ ICT-enabled multimedia classrooms and interactive seminar halls.<br>"
            "• <b>Laboratories</b>: Advanced Computer Labs with 600+ high-end workstations, Central Instrumentation Lab, Micro-scale Chemistry Lab, Tissue Culture Lab, and Garment Construction Studio.<br>"
            "• <b>Green Campus</b>: 100 kW on-grid Solar Rooftop Power Plant generating green electricity; Rainwater Harvesting pits throughout campus.<br>"
            "• <b>Safe Water</b>: Centralized RO Water Purification plants providing pure drinking water at every floor and block.<br>"
            "• <b>Sports Complex</b>: 400m Athletic Track, Indoor Badminton Court, Basketball Court, Volleyball Courts, Kabaddi Arena, and well-equipped Fitness Gym.<br>"
            "• <b>Student Convenience</b>: Indian Bank Extension Counter with 24/7 ATM, Hygienic Canteen, Day Care Centre, Language Lab, and 1,500-capacity Multipurpose Auditorium."
        ),
        "quick_buttons": ["Library (IRC)", "Hostel", "Transport", "Contact"],
        "sources": ["SFRC Campus Infrastructure Inventory 2026"],
        "keywords": "facilities infrastructure smart classroom lab gym sports ro water solar atm canteen auditorium",
    },

    # ── 22. Anti-Ragging & Internal Complaints Committee (ICC) ────────────────
    {
        "id": "anti-ragging-safety",
        "category": "Grievance & Safety",
        "topic": "Anti-Ragging Statutory Policy, ICC & Student Safety",
        "question_patterns": [
            "What is SFRC Anti-Ragging Policy?",
            "How to report ragging or harassment?",
            "National anti-ragging helpline number",
            "Is SFRC ragging-free campus?",
            "internal complaints committee icc"
        ],
        "answer": (
            "🛡 <b>SFRC Zero-Tolerance Anti-Ragging & Campus Safety Statutory Policy</b>:<br><br>"
            "• <b>Strict Mandate</b>: Ragging in any form (physical, verbal, mental, or digital) inside or outside college premises is strictly banned under UGC and Supreme Court directives.<br>"
            "• <b>Anti-Ragging Squad</b>: Chaired by the Principal with Senior Faculty, Police Inspector, Revenue Officials, NGO, and Student Delegates.<br>"
            "• <b>Helpline Numbers</b>:<br>"
            "  - <b>Principal Office</b>: 04562-220389 | Email: <b>principal@sfrcollege.edu.in</b><br>"
            "  - <b>24/7 National Anti-Ragging Toll-Free Helpline</b>: <b>1800-180-5522</b> (helpline@antiragging.in)<br>"
            "• <b>Internal Complaints Committee (ICC)</b>: Formed under the POSH Act 2013 to redress grievances related to gender harassment and ensure a safe, dignified campus.<br>"
            "• <b>Confidential Reporting</b>: File confidential reports directly via <b>Campus Care / Grievance</b> in your Student Portal."
        ),
        "quick_buttons": ["File Confidential Grievance", "Campus Care", "ICC Cell", "Contact Principal"],
        "sources": ["UGC Anti-Ragging Regulations", "SFRC POSH Statutory Policy"],
        "keywords": "anti ragging harassment zero tolerance helpline 1800 180 5522 safety complaint icc posh",
    },

    # ── 23. Online Grievance Redressal (Campus Care) SLA ───────────────────────
    {
        "id": "grievance-portal-sla",
        "category": "Grievance & Safety",
        "topic": "Online Grievance Redressal Mechanism & SLA Timelines",
        "question_patterns": [
            "How to submit a grievance or complaint in portal?",
            "What is the resolution timeline for student complaints?",
            "Can I file a complaint anonymously?",
            "grievance redressal sla time"
        ],
        "answer": (
            "⚖ <b>SFRC Online Grievance Redressal Mechanism (Campus Care)</b>:<br><br>"
            "• <b>Filing Channels</b>: Navigate to <b>Student Portal > Policies > Grievance</b> or ask Pragya directly ('I want to file a complaint').<br>"
            "• <b>Anonymous Privacy</b>: Students may choose the 'Anonymous' option to keep their name and register number hidden from public visibility.<br>"
            "• <b>Strict SLA Timelines</b>:<br>"
            "  - <b>Within 48 Hours</b>: Formal ticket generation (Ref: CC-XXXXX) and assignment to designated Officer.<br>"
            "  - <b>Within 7 Business Days</b>: Complete enquiry, necessary remedial action, and closure status update in your portal.<br>"
            "• <b>Categories</b>: Infrastructure & Maintenance, Academic Issues, Hostel & Mess, Transport, Library, Canteen, Harassment."
        ),
        "quick_buttons": ["File a Grievance", "Track My Grievance", "Anti-Ragging", "Helpdesk"],
        "sources": ["SFRC Grievance Redressal Regulations", "Campus Care Portal"],
        "keywords": "grievance complaint file anonymous sla 48 hours 7 days campus care resolver ticket",
    },

    # ── 24. Official Key Contacts & Directory ─────────────────────────────────
    {
        "id": "contact-official-offices",
        "category": "Contact",
        "topic": "Official College Contact Numbers, Emails & Campus Address",
        "question_patterns": [
            "What is college phone number and email?",
            "How to contact Principal Office or COE?",
            "College address and location",
            "Helpdesk contact details",
            "sfrc contact details phone number email"
        ],
        "answer": (
            "📞 <b>The Standard Fireworks Rajaratnam College for Women (Autonomous)</b>:<br><br>"
            "• <b>Postal Address</b>: Thiruthangal Road, Sivakasi – 626 123, Virudhunagar District, Tamil Nadu, India.<br>"
            "• <b>Principal Office</b>: +91 4562 220389 | Email: <b>principal@sfrcollege.edu.in</b><br>"
            "• <b>General College Enquiries</b>: +91 4562 220386 | Email: <b>sfrc@sfrcollege.edu.in</b><br>"
            "• <b>Controller of Examinations (COE)</b>: +91 4562 220389 (Ext: 104) | Email: <b>coe@sfrcollege.edu.in</b><br>"
            "• <b>Admission Helpdesk</b>: +91 4562 220389 (Ext: 102) | Email: <b>admissions@sfrcollege.edu.in</b><br>"
            "• <b>Official Website</b>: <a href='https://www.sfrcollege.edu.in/' target='_blank'>www.sfrcollege.edu.in</a><br>"
            "• <b>Office Working Hours</b>: 8:30 AM to 5:00 PM (Monday to Saturday, except government holidays & second Saturdays)."
        ),
        "quick_buttons": ["Admissions", "Departments", "Transport", "Library"],
        "sources": ["SFRC Official Directory 2026", "www.sfrcollege.edu.in"],
        "keywords": "contact phone email address principal coe sivakasi office helpdesk location website",
    },

    # ── 25. Revaluation & Transparency Photocopy Procedure ────────────────────
    {
        "id": "acad-revaluation",
        "category": "Academics",
        "topic": "End-Semester Paper Revaluation & Transparency Photocopy Procedure",
        "question_patterns": [
            "How to apply for revaluation of exam papers?",
            "Re-totalling and transparency copy procedure",
            "What is the fee and deadline for revaluation?",
            "revaluation fee paper retotalling",
            "marukootal revaluation epdi apply panrathu"
        ],
        "answer": (
            "📄 <b>Revaluation & Transparency Photocopy Procedure</b>:<br><br>"
            "• <b>Transparency (Photocopy of Answer Script)</b>:<br>"
            "  - Apply within <b>7 days</b> of semester exam results publication through COE office or online portal.<br>"
            "  - Fee: <b>₹300 per theory course</b>.<br><br>"
            "• <b>Revaluation of Answer Script</b>:<br>"
            "  - Students who applied for transparency can apply for revaluation within <b>10 days</b> of result declaration.<br>"
            "  - Fee: <b>₹500 per theory course</b>.<br><br>"
            "• <b>Mark Adjustment</b>: If the revalued mark increases by <b>5 marks or more</b>, the revised higher mark is officially awarded and fresh marksheet issued."
        ),
        "quick_buttons": ["Check My Marks", "COE Office", "Passing Minimum", "Exams"],
        "sources": ["Office of Controller of Examinations (COE) Manual"],
        "keywords": "revaluation retotalling transparency photocopy marksheet coe results exam 300 500",
    },

    # ── 26. College Shifts & Working Hours ────────────────────────────────────
    {
        "id": "college-timing-shifts",
        "category": "About SFRC",
        "topic": "College Daily Timings, Shifts & Bell Schedule",
        "question_patterns": [
            "What are the college working hours?",
            "What time does college start and end?",
            "Regular shift and evening shift timing",
            "college bell schedule",
            "college timing enna"
        ],
        "answer": (
            "⏰ <b>SFRC College Working Hours & Shift Schedules</b>:<br><br>"
            "• <b>Regular / Aided Shift (Shift I)</b>: <b>8:30 AM to 1:30 PM</b> (5 Periods of 55 minutes each with a 15-minute recess).<br>"
            "• <b>Self-Financed Shift (Shift II)</b>: <b>1:45 PM to 6:00 PM</b>.<br>"
            "• <b>Library Hours</b>: 8:30 AM to 5:30 PM (Working days), 9:00 AM to 4:00 PM (Saturdays).<br>"
            "• <b>Administrative Office</b>: 8:30 AM to 5:00 PM.<br>"
            "• <b>Hostel Study Hours</b>: 8:30 PM to 10:30 PM (Mandatory silent study)."
        ),
        "quick_buttons": ["Timetable", "Library", "Bus Timings", "Contact"],
        "sources": ["SFRC Academic Calendar", "Student Handbook"],
        "keywords": "timing hours shifts regular evening 8:30 1:30 1:45 6:00 schedule bell",
    },
]
