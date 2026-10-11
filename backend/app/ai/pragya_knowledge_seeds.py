"""Comprehensive Institutional Knowledge Seeds for Pragya AI.
Covers 50+ real-world college topics: Admissions, Autonomous Academics, CIA Scheme,
Attendance Regulations, Scholarships, Departments, Fees, Transport, Hostel, Library,
Placements, Startups (ACIDE), YWED, Clubs, Grievances, Anti-Ragging, and Contacts.
"""
from __future__ import annotations

from typing import List, Dict, Any

SEED_PRAGYA_KNOWLEDGE: List[Dict[str, Any]] = [
    # ── 1. Admissions & Eligibility ─────────────────────────────────────────────
    {
        "id": "adm-ug-aided",
        "category": "Admissions",
        "topic": "Undergraduate (UG) Aided Admissions & Eligibility",
        "question_patterns": [
            "How to apply for UG Aided courses?",
            "What are the Aided courses in SFRC?",
            "What is the eligibility for B.Sc / B.A Aided?",
            "Aided admission procedure"
        ],
        "answer": (
            "🎓 <b>SFRC Undergraduate (UG) Aided Programmes</b>:<br><br>"
            "• <b>Offered Courses</b>: B.A. Tamil, B.A. English, B.Sc. Mathematics, B.Sc. Physics, B.Sc. Chemistry, B.Sc. Botany.<br>"
            "• <b>Eligibility</b>: Higher Secondary Examination (+2) pass in relevant academic streams from a recognized board.<br>"
            "• <b>Duration</b>: 3 Academic Years (6 Semesters) under Autonomous CBCS.<br>"
            "• <b>Application Process</b>: Apply online via the SFRC Portal or obtain physical forms at the Administrative Block.<br>"
            "• <b>Government Reservation</b>: Fully adheres to Government of Tamil Nadu reservation norms (OC, BC, BCM, MBC/DNC, SC, SCA, ST)."
        ),
        "quick_buttons": ["Aided Courses", "Self-Finance Courses", "Fees", "Admissions Contact"],
        "sources": ["SFRC Admission Prospectus 2026", "Aided Programmes Handbook"],
        "keywords": "aided admission ug ba bsc tamil english maths physics chemistry botany eligibility",
    },
    {
        "id": "adm-ug-sf",
        "category": "Admissions",
        "topic": "Undergraduate (UG) Self-Financing Programmes",
        "question_patterns": [
            "What are the Self-Finance courses in SFRC?",
            "How to apply for BCA or B.Sc Computer Science or Data Science?",
            "B.Com and BBA admission eligibility",
            "Self finance UG admissions"
        ],
        "answer": (
            "🏛 <b>SFRC Undergraduate (UG) Self-Financing Programmes</b>:<br><br>"
            "• <b>Computing & Tech</b>: B.Sc. Computer Science, B.Sc. Data Science, B.C.A. (Computer Applications), B.Sc. Information Technology.<br>"
            "• <b>Commerce & Management</b>: B.Com. (General), B.Com. (Computer Applications), B.Com. (Professional Accounting), B.B.A.<br>"
            "• <b>Sciences & Humanities</b>: B.Sc. Microbiology, B.Sc. Nutrition & Dietetics, B.Sc. Costume Design & Fashion, B.A. English (SF).<br>"
            "• <b>Eligibility</b>: +2 pass with relevant subjects (Maths/CS/Commerce/Science stream).<br>"
            "• <b>Key Highlights</b>: Industry-aligned curriculum, state-of-the-art computer labs, and integrated cloud computing modules."
        ),
        "quick_buttons": ["Self-Finance Courses", "Fees", "Placements", "Contact"],
        "sources": ["SFRC Self-Financing Wing Guide", "Academic Handbook"],
        "keywords": "self finance sf bca bsc cs data science bcom bba nutrition commerce",
    },
    {
        "id": "adm-pg",
        "category": "Admissions",
        "topic": "Postgraduate (PG) Programmes & Entry Requirements",
        "question_patterns": [
            "What PG courses are offered at SFRC?",
            "Eligibility for M.Sc Computer Science or Data Science or M.Com",
            "How to join M.A English or M.Sc Chemistry?",
            "PG admissions details"
        ],
        "answer": (
            "🎓 <b>SFRC Postgraduate (PG) Programmes</b>:<br><br>"
            "• <b>Sciences</b>: M.Sc. Computer Science, M.Sc. Data Science, M.Sc. Chemistry, M.Sc. Botany, M.Sc. Mathematics, M.Sc. Physics.<br>"
            "• <b>Commerce & Arts</b>: M.Com. (Computer Applications), M.A. English Literature, M.A. Tamil, M.A. History.<br>"
            "• <b>Eligibility</b>: Bachelor's Degree in the relevant discipline with a minimum of 50% aggregate marks.<br>"
            "• <b>Duration</b>: 2 Years (4 Semesters) with mandatory industry internship and capstone dissertation."
        ),
        "quick_buttons": ["PG Courses", "Fees", "PhD Guides", "Admissions"],
        "sources": ["SFRC PG Studies Bulletin 2026"],
        "keywords": "pg master msc mcom ma computer science data science chemistry english admission",
    },
    {
        "id": "adm-phd",
        "category": "Admissions",
        "topic": "Doctoral (Ph.D) Research Programmes & Recognized Centres",
        "question_patterns": [
            "How to apply for Ph.D in SFRC?",
            "What are the recognized research departments?",
            "PhD guides and research supervisors",
            "Doctoral admission eligibility"
        ],
        "answer": (
            "🔬 <b>Ph.D Research Programmes at SFRC</b>:<br><br>"
            "• <b>Approved Research Centres</b>: Tamil, Commerce, Computer Science, Chemistry, Physics, Botany, English.<br>"
            "• <b>Affiliation</b>: Madurai Kamaraj University (MKU) recognized Research Centres.<br>"
            "• <b>Eligibility</b>: Master's Degree with minimum 55% marks (50% for SC/ST/OBC non-creamy layer) + MKU Common Entrance Test or UGC-NET/CSIR-NET/SET/GATE exemption.<br>"
            "• <b>Support</b>: Access to central instrumentation facilities, high-performance computing, and DST/UGC research fellowship guidance."
        ),
        "quick_buttons": ["PhD Guides", "Research Projects", "Faculty", "Contact"],
        "sources": ["SFRC Research Cell Bulletin", "MKU Ph.D Regulations"],
        "keywords": "phd doctor research guides supervisor mku entrance fellowship net set",
    },
    {
        "id": "adm-documents",
        "category": "Admissions",
        "topic": "Documents Required for Admission Verification",
        "question_patterns": [
            "What documents are needed for admission?",
            "Certificates required during college admission",
            "Admission document checklist"
        ],
        "answer": (
            "📋 <b>Mandatory Document Checklist for Admission</b>:<br><br>"
            "1. Original Transfer Certificate (TC) & Conduct Certificate from previous institution.<br>"
            "2. 10th Standard (SSLC) & 12th Standard (+2) Original Marksheets + 3 xerox copies.<br>"
            "3. Community Certificate (Permanent Card) issued by competent Tahsildar authority.<br>"
            "4. Income Certificate (issued within last 6 months for scholarship processing).<br>"
            "5. Aadhar Card copy.<br>"
            "6. 5 Recent Passport-size Photographs in formal attire.<br>"
            "7. Special Category Certificate (Sports / Ex-Serviceman / Differently-Abled) if applicable."
        ),
        "quick_buttons": ["Admissions", "Fees", "Scholarships", "Contact"],
        "sources": ["SFRC Admission Cell Notification"],
        "keywords": "documents certificate tc marksheet community income aadhar photos verification",
    },

    # ── 2. Autonomous Academics & Evaluation ───────────────────────────────────
    {
        "id": "acad-passing-min",
        "category": "Academics",
        "topic": "Passing Minimum Marks & Grading System",
        "question_patterns": [
            "What is the passing minimum mark in semester exams?",
            "How many marks are needed to pass in UG and PG?",
            "Passing criteria for CIA and End Semester Exam"
        ],
        "answer": (
            "📊 <b>Autonomous Examination Passing Criteria</b>:<br><br>"
            "• <b>Undergraduate (UG)</b>:<br>"
            "  - Minimum 35% in End-Semester Exam (ESE) (i.e., 21 out of 60 marks).<br>"
            "  - Minimum 40% aggregate in CIA + ESE combined (i.e., 40 out of 100 marks).<br><br>"
            "• <b>Postgraduate (PG)</b>:<br>"
            "  - Minimum 45% in End-Semester Exam (ESE) (i.e., 27 out of 60 marks).<br>"
            "  - Minimum 50% aggregate in CIA + ESE combined (i.e., 50 out of 100 marks).<br><br>"
            "• <b>Practical Courses</b>: 40% aggregate for UG and 50% for PG with mandatory lab record submission."
        ),
        "quick_buttons": ["CIA Scheme", "Attendance Rules", "Revaluation", "Exams"],
        "sources": ["SFRC Autonomous Examination Manual", "Controller of Examinations (COE)"],
        "keywords": "passing mark minimum pass ug pg percentage ese cia 40 50 grade",
    },
    {
        "id": "acad-cia-scheme",
        "category": "Academics",
        "topic": "Continuous Internal Assessment (CIA) Calculation Scheme",
        "question_patterns": [
            "How are CIA internal marks calculated?",
            "What is the CIA split for 40 marks?",
            "Internal mark calculation method",
            "How many CIA tests are conducted?"
        ],
        "answer": (
            "📝 <b>Continuous Internal Assessment (CIA) Scheme (40 Marks Total)</b>:<br><br>"
            "• <b>CIA Periodic Tests (25 Marks)</b>: 3 centralized CIA tests are conducted per semester. The <b>best 2 scores</b> are averaged and converted to 25 marks.<br>"
            "• <b>Creative Assignment / Seminar / Quiz (10 Marks)</b>: Two academic submissions (5 marks each) evaluating conceptual depth and presentations.<br>"
            "• <b>Attendance Regularity (5 Marks)</b>:<br>"
            "  - 95% – 100%: 5 Marks<br>"
            "  - 90% – 94%: 4 Marks<br>"
            "  - 85% – 89%: 3 Marks<br>"
            "  - 80% – 84%: 2 Marks<br>"
            "  - 75% – 79%: 1 Mark<br>"
            "  - Below 75%: 0 Marks"
        ),
        "quick_buttons": ["Check My Marks", "Attendance Rules", "Passing Minimum", "Exams"],
        "sources": ["Autonomous Academic Handbook", "Dean of Academic Affairs"],
        "keywords": "cia internal marks calculation tests assignment regularity attendance split 40 25 10 5",
    },
    {
        "id": "acad-attendance-rule",
        "category": "Academics",
        "topic": "Mandatory 75% Attendance Regulation & Condonation Rules",
        "question_patterns": [
            "What is the minimum attendance percentage required?",
            "What happens if attendance is below 75%?",
            "Attendance condonation eligibility and rules",
            "Attendance requirement for semester exams"
        ],
        "answer": (
            "⏱ <b>Attendance Requirements & Exam Eligibility Regulations</b>:<br><br>"
            "• <b>75% and Above</b>: Eligible to appear for Autonomous End-Semester Examinations (ESE) in all registered courses.<br>"
            "• <b>65% to 74% (Condonation Bracket)</b>: Eligible to apply for <b>Principal Condonation</b> by submitting valid medical certificate or On-Duty (OD) proof along with the prescribed condonation fee.<br>"
            "• <b>50% to 64%</b>: Not eligible to write current semester exams; allowed to write in subsequent semester after compensatory attendance.<br>"
            "• <b>Below 50%</b>: Student must repeat (re-do) the semester in the next academic year."
        ),
        "quick_buttons": ["Check My Attendance", "Apply Condonation", "Leave Rules", "Academic Calendar"],
        "sources": ["SFRC Autonomous Academic Regulations", "Student Handbook"],
        "keywords": "attendance percentage rule 75 condonation 65 shortage exam eligibility repeat",
    },
    {
        "id": "acad-condonation-process",
        "category": "Academics",
        "topic": "Attendance Condonation Application Workflow",
        "question_patterns": [
            "How to apply for attendance condonation?",
            "Condonation fee and medical proof submission",
            "When to apply for condonation?"
        ],
        "answer": (
            "📝 <b>Attendance Condonation Application Procedure</b>:<br><br>"
            "1. <b>Eligibility Check</b>: Aggregate attendance must be between 65.0% and 74.9%.<br>"
            "2. <b>Submission</b>: Fill out the Condonation Form available at the College Office or apply via the Student Portal.<br>"
            "3. <b>Attachments</b>: Attach original Medical Certificate signed by a Registered Medical Practitioner (RMP) or approved On-Duty (OD) authorization letters.<br>"
            "4. <b>Approval & Fee</b>: Forward through Faculty Mentor & HOD to the Principal. Pay the prescribed condonation fee before the deadline published by the Controller of Examinations."
        ),
        "quick_buttons": ["Check My Attendance", "Attendance Rules", "Contact HOD", "Portal Help"],
        "sources": ["Controller of Examinations (COE) Circular"],
        "keywords": "apply condonation medical certificate od proof deadline principal approval",
    },
    {
        "id": "acad-revaluation",
        "category": "Academics",
        "topic": "End-Semester Paper Revaluation & Re-totalling Procedure",
        "question_patterns": [
            "How to apply for revaluation of exam papers?",
            "Re-totalling and transparency copy procedure",
            "What is the fee and deadline for revaluation?"
        ],
        "answer": (
            "📄 <b>Revaluation & Transparency Photocopy Procedure</b>:<br><br>"
            "• <b>Transparency (Photocopy)</b>: Students can apply for a photocopy of their evaluated answer script within 7 days of results publication.<br>"
            "• <b>Revaluation</b>: Apply through the COE office within 10 days of results declaration.<br>"
            "• <b>Fee Structure</b>: Transparency Photocopy: ₹300 per paper | Revaluation: ₹500 per paper.<br>"
            "• <b>Outcome</b>: If the revalued mark increases by 5 or more marks, the higher mark is officially awarded and updated in the digital marksheet."
        ),
        "quick_buttons": ["Check My Marks", "COE Office", "Passing Minimum", "Exams"],
        "sources": ["Office of the Controller of Examinations (COE)"],
        "keywords": "revaluation retotalling transparency photocopy marksheet coe results exam",
    },

    # ── 3. Scholarships & Financial Aid ─────────────────────────────────────────
    {
        "id": "sch-pudhumai-penn",
        "category": "Scholarships",
        "topic": "Moovalur Ramamirtham Ammaiyar Pudhumai Penn Scheme",
        "question_patterns": [
            "What is Pudhumai Penn scholarship scheme?",
            "Who is eligible for Rs 1000 monthly scheme for girl students?",
            "How to apply for Moovalur Ramamirtham scheme?"
        ],
        "answer": (
            "🌸 <b>Pudhumai Penn Scheme (Moovalur Ramamirtham Ammaiyar)</b>:<br><br>"
            "• <b>Benefit</b>: <b>₹1,000 per month</b> credited directly to the student's bank account via Direct Benefit Transfer (DBT) until degree completion.<br>"
            "• <b>Eligibility</b>: Female students who studied in <b>Government Schools from Class 6 to Class 12 in Tamil Nadu</b> and are enrolled in undergraduate degree courses.<br>"
            "• <b>Application</b>: Processed through the College Scholarship Nodal Officer with EMIS number, 10th/12th marksheets, and Aadhaar-seeded bank passbook."
        ),
        "quick_buttons": ["Other Scholarships", "Fees", "Scholarship Desk", "Contact"],
        "sources": ["Higher Education Department, Govt of Tamil Nadu", "SFRC Scholarship Cell"],
        "keywords": "pudhumai penn 1000 moovalur ramamirtham govt school girl student dbt scholarship",
    },
    {
        "id": "sch-gov-schemes",
        "category": "Scholarships",
        "topic": "Government BC / MBC / DNC & SC / ST Post-Matric Scholarships",
        "question_patterns": [
            "What government scholarships can I apply for?",
            "BC MBC scholarship eligibility and income limit",
            "SC ST scholarship benefits and renewal",
            "State govt scholarship schemes"
        ],
        "answer": (
            "🏛 <b>Government Welfare Scholarships Available at SFRC</b>:<br><br>"
            "1. <b>BC / MBC / DNC Welfare Scholarship</b>: For students whose annual parental income is below <b>₹2,500,000</b>. Covers tuition and examination fees.<br>"
            "2. <b>SC / ST / SCA Post-Matric Scholarship</b>: Full tuition fee exemption & monthly maintenance allowance for parental income below <b>₹2,50,000</b>.<br>"
            "3. <b>Chief Minister's Higher Education Special Scholarship</b>: ₹8,000 per annum for SC/ST students staying in college recognized hostels.<br>"
            "4. <b>Minority Scholarship</b>: Central Sector / State minority scholarship for Muslim, Christian, and Jain students scoring above 50%."
        ),
        "quick_buttons": ["Pudhumai Penn", "Management Concessions", "Fees", "Scholarship Desk"],
        "sources": ["Tamil Nadu Welfare Department", "SFRC Nodal Officer"],
        "keywords": "bc mbc dnc sc st post matric minority chief minister income limit scholarship",
    },
    {
        "id": "sch-management",
        "category": "Scholarships",
        "topic": "SFRC Management Merit Concessions & Need-Based Aid",
        "question_patterns": [
            "Does SFRC college management provide scholarships?",
            "Sports quota concessions and fee waiver",
            "Single parent financial assistance",
            "Management fee concession"
        ],
        "answer": (
            "🤝 <b>SFRC Management Concessions & Philanthropic Aid</b>:<br><br>"
            "• <b>Merit Concessions</b>: Top academic rank holders in each semester receive tuition fee concessions.<br>"
            "• <b>Sports Quota Waiver</b>: State/National sports medalists receive up to 100% tuition and hostel fee waiver.<br>"
            "• <b>Underprivileged & Single Parent Aid</b>: Special financial grants provided to deserving students facing financial hardships.<br>"
            "• <b>Application</b>: Submit representation along with income and academic credentials to the Principal in July each year."
        ),
        "quick_buttons": ["Government Scholarships", "Fees", "Sports Cell", "Principal Office"],
        "sources": ["SFRC Management Trust Regulations"],
        "keywords": "management scholarship merit sports single parent concession financial aid waiver",
    },

    # ── 4. Fees Structure & Online Payment ──────────────────────────────────────
    {
        "id": "fee-payment-guide",
        "category": "Fees",
        "topic": "How to Pay College, Exam & Transport Fees Online",
        "question_patterns": [
            "How to pay college fees online?",
            "What are the payment methods for semester fees?",
            "How to download fee payment receipt?",
            "Exam fee payment link"
        ],
        "answer": (
            "💳 <b>Online Fee Payment Guide for SFRC Students</b>:<br><br>"
            "1. <b>Student Portal</b>: Navigate to <b>Dashboard > Fees</b> to view your active fee dues breakdown.<br>"
            "2. <b>Payment Channels</b>: Pay directly using UPI (Google Pay, PhonePe, Paytm), Net Banking, or Debit/Credit Cards via HDFC / SBI Payment Gateway.<br>"
            "3. <b>Receipt Generation</b>: Upon successful transaction, an instant authenticated <b>PDF Receipt with reference number</b> is generated in your portal.<br>"
            "4. <b>Offline Counter</b>: Bank challan payment at the Indian Bank / Central Bank campus extension counters during working hours (9:00 AM – 3:00 PM)."
        ),
        "quick_buttons": ["Check Fee Dues", "Download Receipts", "Bank Helpdesk", "Scholarships"],
        "sources": ["SFRC Accounts Branch Notification"],
        "keywords": "fee pay online payment portal upi receipt sbi hdfc download dues",
    },

    # ── 5. Central Library (Information Resource Centre) ─────────────────────────
    {
        "id": "lib-irc-resources",
        "category": "Library",
        "topic": "Central Library (IRC) Timings, Catalog & E-Resources",
        "question_patterns": [
            "What are the library timings?",
            "What e-resources and journals are available in library?",
            "How many books can a student borrow?",
            "Library membership and rules"
        ],
        "answer": (
            "📚 <b>SFRC Information Resource Centre (Central Library)</b>:<br><br>"
            "• <b>Timings</b>: Monday to Friday: <b>8:00 AM – 8:00 PM</b> | Saturday: <b>8:00 AM – 5:00 PM</b>.<br>"
            "• <b>Collection</b>: 64,795+ Printed Books, 12,000+ Reference Titles, 150+ Print Periodicals.<br>"
            "• <b>Digital Library E-Resources</b>: Full access to <b>INFLIBNET N-LIST</b> (6,000+ e-journals & 1,99,500+ e-books), <b>DELNET</b>, <b>J-Gate Science & Humanities</b>, and <b>Turnitin Plagiarism Detection</b>.<br>"
            "• <b>Borrowing Limits</b>:<br>"
            "  - UG Students: 3 Books (14 Days)<br>"
            "  - PG Students: 5 Books (21 Days)<br>"
            "  - Ph.D Scholars: 8 Books (30 Days)<br>"
            "• <b>Facilities</b>: Air-conditioned digital access lab with 40 high-speed multimedia systems, OPAC search kiosks, and silent research cubicles."
        ),
        "quick_buttons": ["Search Library Books", "E-Content Hub", "Library Rules", "Campus Facilities"],
        "sources": ["SFRC Central Library Information Guide"],
        "keywords": "library irc books timing nlist delnet jgate borrow borrow limit digital opac",
    },

    # ── 6. Transport & Bus Network ──────────────────────────────────────────────
    {
        "id": "trans-routes-guide",
        "category": "Transport",
        "topic": "College Bus Network, Timings & Route Coverage",
        "question_patterns": [
            "What are the college bus routes and stops?",
            "Bus timing to Sattur, Rajapalayam, Srivilliputhur, Thiruthangal",
            "How to get college bus pass?",
            "Transport network details"
        ],
        "answer": (
            "🚌 <b>SFRC Dedicated College Bus Transport Fleet (12 Routes)</b>:<br><br>"
            "• <b>Route 1</b>: Thiruthangal Bus Stand (07:45 AM) ➔ Sivakasi New Bus Stand (08:00 AM) ➔ SFRC Campus (08:20 AM).<br>"
            "• <b>Route 2</b>: Sattur Bus Stand (07:30 AM) ➔ Thayilpatti Junction (07:50 AM) ➔ SFRC Campus (08:25 AM).<br>"
            "• <b>Route 3</b>: Srivilliputhur Tower (07:20 AM) ➔ Rajapalayam Bus Stand (07:45 AM) ➔ SFRC Campus (08:25 AM).<br>"
            "• <b>Route 4</b>: Sivakasi Town Loop: Railway Feeder Rd ➔ Coronation Colony ➔ SFRC Campus.<br>"
            "• <b>Route 5 & 6</b>: Watrap, Vembakottai, Alangulam, Krishnankovil routes.<br>"
            "• <b>Bus Pass</b>: Apply or renew digital bus pass in portal under <b>Facilities > Transport</b>."
        ),
        "quick_buttons": ["View Bus Routes", "Transport Fees", "Bus In-charge", "Campus Facilities"],
        "sources": ["SFRC Transport Operations Cell"],
        "keywords": "transport bus routes timing sattur rajapalayam srivilliputhur thiruthangal pass",
    },

    # ── 7. Hostel Accommodation & Student Life ──────────────────────────────────
    {
        "id": "hostel-living-guide",
        "category": "Hostel",
        "topic": "Hostel Accommodation, Dining & Outpass Regulations",
        "question_patterns": [
            "What are the hostel facilities in SFRC?",
            "Hostel mess menu and study hours",
            "How to apply for hostel outpass?",
            "Hostel rules and chief warden contact"
        ],
        "answer": (
            "🏡 <b>SFRC Residential Hostels (Ganga, Yamuna, Kaveri, Narmada Blocks)</b>:<br><br>"
            "• <b>Amenities</b>: Spacious furnished rooms, 24/7 purified RO drinking water, hot water solar plant, study halls, recreation hall, and resident health clinic with nurse.<br>"
            "• <b>Dining</b>: FSSAI certified hygienic vegetarian & non-vegetarian kitchen with wholesome regional menu.<br>"
            "• <b>Study Hours</b>: Mandatory silent study hours between <b>8:30 PM and 10:30 PM</b>.<br>"
            "• <b>Digital Outpass System</b>: Outpass must be applied online via the portal with parental SMS/call consent and Warden verification.<br>"
            "• <b>Chief Warden</b>: Dr. S. Geetha (Contact: 04562-220389)."
        ),
        "quick_buttons": ["Apply Outpass", "Hostel Dues", "Campus Care", "Contact Warden"],
        "sources": ["SFRC Hostel Rules Handbook"],
        "keywords": "hostel room mess food timing study hours outpass ganga yamuna warden",
    },

    # ── 8. Placements & Career Guidance ─────────────────────────────────────────
    {
        "id": "place-corporate-drives",
        "category": "Placements",
        "topic": "Placement Training, Top Recruiters & Campus Drives",
        "question_patterns": [
            "What companies visit SFRC for campus placements?",
            "Placement training and eligibility criteria",
            "Highest CTC package and placement percentage",
            "Placement drive schedule"
        ],
        "answer": (
            "💼 <b>SFRC Career Guidance & Placement Cell</b>:<br><br>"
            "• <b>Key Recruiters</b>: Tata Consultancy Services (TCS), Cognizant (CTS), Wipro, Infosys, Zoho Corporation, Deloitte, ICICI Bank, Foxconn, Aravind Eye Care, Omega Healthcare.<br>"
            "• <b>Salary Packages</b>: CTC ranges from <b>₹2.80 LPA to ₹6.50 LPA</b>.<br>"
            "• <b>Training Modules</b>: Full-stack programming, quantitative aptitude, mock technical interviews, soft skills, and communication training.<br>"
            "• <b>Portal Application</b>: Register and track upcoming drive schedules directly from <b>Dashboard > Placements</b>."
        ),
        "quick_buttons": ["View Placement Drives", "My Applications", "Resume Review", "Placements"],
        "sources": ["SFRC Career Guidance and Placement Cell Report 2026"],
        "keywords": "placement jobs companies tcs cognizant zoho wipro infosys salary ctc drives",
    },

    # ── 9. Startups, Innovation (ACIDE / IEDC) & YWED ───────────────────────────
    {
        "id": "acide-startup-hub",
        "category": "Innovation",
        "topic": "ACIDE Incubation Centre, Student Startups & Seed Grants",
        "question_patterns": [
            "What is ACIDE incubation centre?",
            "How can a student start a startup in SFRC?",
            "Seed funding for student innovative projects",
            "IEDC and MSME patent support"
        ],
        "answer": (
            "🚀 <b>ACIDE (Anusha Centre for Innovation & Digital Entrepreneurship)</b>:<br><br>"
            "• <b>Incubation Support</b>: Mentorship from industry founders, co-working lab space, high-speed cloud infrastructure, and business model prototyping.<br>"
            "• <b>Seed Grants</b>: Up to <b>₹50,000 prototype funding</b> under IEDC (DST) & MSME incubation schemes.<br>"
            "• <b>Patent Support</b>: Dedicated IPR Cell assisting students with full patent filing, copyright registration, and legal expenses.<br>"
            "• <b>Active Startups</b>: 12+ student-incubated ventures in Agri-Tech, Ed-Tech, Sustainable Bio-Products, and AI SaaS."
        ),
        "quick_buttons": ["View Startups", "Apply Incubation", "YWED Courses", "Research Hub"],
        "sources": ["ACIDE Incubation Brochure", "IEDC Project Cell"],
        "keywords": "acide startup innovation incubation iedc seed funding prototype grant patent",
    },
    {
        "id": "ywed-vocational-skills",
        "category": "Innovation",
        "topic": "YWED (Young Women Entrepreneurship Development) Certificate Courses",
        "question_patterns": [
            "What are YWED courses in SFRC?",
            "Vocational skill training certificate programmes",
            "How to enroll in YWED courses?"
        ],
        "answer": (
            "🧵 <b>YWED (Young Women Entrepreneurship Development) Centre</b>:<br><br>"
            "• <b>Objective</b>: Imparting market-ready entrepreneurial skills to empower every student with self-employment capabilities.<br>"
            "• <b>Popular Courses</b>: Apparel Designing & Tailoring, Herbal Cosmetics Formulation, Food Processing & Preservation, Digital Marketing & Content Creation, Python & AI Tools.<br>"
            "• <b>Certification</b>: Authorized certification with hands-on live product exhibitions (Kala Mela).<br>"
            "• <b>Enrollment</b>: Open to all UG & PG students at nominal fee in the 2nd & 3rd year."
        ),
        "quick_buttons": ["YWED Courses", "ACIDE Startups", "Student Life", "Contact"],
        "sources": ["YWED Centre Annual Handbook"],
        "keywords": "ywed vocational skill courses tailoring cosmetics food processing certificate entrepreneurship",
    },

    # ── 10. Student Life, Clubs & Extension Activities ──────────────────────────
    {
        "id": "clubs-extension-units",
        "category": "Student Life",
        "topic": "NSS, NCC, YRC, RRC, Fine Arts & Department Associations",
        "question_patterns": [
            "What clubs and extension activities are available in SFRC?",
            "How to join NSS or NCC in college?",
            "Fine arts and cultural competition details",
            "Youth Red Cross and Eco club"
        ],
        "answer": (
            "🎨 <b>SFRC Student Extension Units & Cultural Clubs</b>:<br><br>"
            "• <b>National Service Scheme (NSS)</b>: 2 active units engaging in rural village adoption, environmental awareness, and literacy camps.<br>"
            "• <b>National Cadet Corps (NCC)</b>: Army and Navy Wings providing B & C certificate training and Republic Day Camp (RDC) representation.<br>"
            "• <b>Youth Red Cross (YRC) & Red Ribbon Club (RRC)</b>: First aid certification, blood donation camps, and community health drives.<br>"
            "• <b>Cultural & Special Clubs</b>: Fine Arts Club, Eco Club, Rotaract Club, Consumer Club, Science Forum, Literary Association.<br>"
            "• <b>Sports Complex</b>: 400m Athletic Track, Indoor Badminton, Basketball, Volleyball, and Gym."
        ),
        "quick_buttons": ["View Clubs", "Sports Complex", "Upcoming Events", "Student Life"],
        "sources": ["SFRC Student Affairs Handbook"],
        "keywords": "clubs nss ncc yrc rrc fine arts cultural sports gym rotaract eco volunteer",
    },

    # ── 11. Grievance Redressal, Anti-Ragging & Safety ───────────────────────────
    {
        "id": "anti-ragging-policy",
        "category": "Grievance & Safety",
        "topic": "Anti-Ragging Zero Tolerance Policy & Statutory Committees",
        "question_patterns": [
            "What is SFRC Anti-Ragging Policy?",
            "How to report ragging or harassment?",
            "National anti-ragging helpline number",
            "Is SFRC ragging-free campus?"
        ],
        "answer": (
            "🛡 <b>SFRC Zero-Tolerance Anti-Ragging Statutory Policy</b>:<br><br>"
            "• <b>Strict Mandate</b>: Ragging in any form (physical, verbal, psychological, or digital) inside or outside campus is strictly prohibited under UGC / Supreme Court Regulations.<br>"
            "• <b>Anti-Ragging Squad</b>: Headed by the Principal with senior faculty, Police representatives, and student delegates.<br>"
            "• <b>Reporting Channels</b>:<br>"
            "  - College Helpline: <b>04562-220389</b> / Email: <b>principal@sfrcollege.edu.in</b><br>"
            "  - 24/7 National Anti-Ragging Toll-Free Helpline: <b>1800-180-5522</b> (helpline@antiragging.in)<br>"
            "  - Online Portal: Submit direct confidential report via <b>Campus Care / Grievance</b>."
        ),
        "quick_buttons": ["File Confidential Grievance", "Campus Care", "ICC Cell", "Contact Principal"],
        "sources": ["UGC Anti-Ragging Regulations", "SFRC Statutory Policy"],
        "keywords": "anti ragging harassment zero tolerance helpline 1800 180 5522 safety complaint",
    },
    {
        "id": "grievance-portal-sla",
        "category": "Grievance & Safety",
        "topic": "Online Grievance Redressal Mechanism & SLA Timelines",
        "question_patterns": [
            "How to submit a grievance or complaint in portal?",
            "What is the resolution timeline for student complaints?",
            "Can I file a complaint anonymously?"
        ],
        "answer": (
            "⚖ <b>SFRC Online Grievance Redressal Mechanism (Campus Care)</b>:<br><br>"
            "• <b>Filing Methods</b>: Submit via <b>Portal > Policies > Grievance</b> or ask Pragya directly ('I want to file a complaint').<br>"
            "• <b>Anonymous Option</b>: Students may check 'Anonymous' to conceal identity from public views.<br>"
            "• <b>SLA Redressal Timelines</b>:<br>"
            "  - <b>Within 48 Hours</b>: Formal acknowledgement and assignment to Department Nodal Officer.<br>"
            "  - <b>Within 7 Business Days</b>: Comprehensive investigation, remedial action, and resolution report posted on student portal.<br>"
            "• <b>Categories</b>: Academic, Infrastructure, Hostel, Transport, Library, Harassment, Canteen."
        ),
        "quick_buttons": ["File a Grievance", "Track My Grievance", "Anti-Ragging", "Helpdesk"],
        "sources": ["SFRC Grievance Redressal Regulations"],
        "keywords": "grievance complaint file anonymous sla 48 hours 7 days campus care resolver",
    },

    # ── 12. Institutional Key Contacts & Helpdesk ────────────────────────────────
    {
        "id": "contact-official-offices",
        "category": "Contact",
        "topic": "Official College Contact Numbers, Emails & Addresses",
        "question_patterns": [
            "What is college phone number and email?",
            "How to contact Principal Office or COE?",
            "College address and location",
            "Helpdesk contact details"
        ],
        "answer": (
            "📞 <b>The Standard Fireworks Rajaratnam College for Women (Autonomous)</b>:<br><br>"
            "• <b>Address</b>: Thiruthangal Road, Sivakasi – 626 123, Virudhunagar District, Tamil Nadu, India.<br>"
            "• <b>Principal Office</b>: 04562-220389 | Email: <b>principal@sfrcollege.edu.in</b><br>"
            "• <b>General College Office</b>: 04562-220389 | Email: <b>sfrc@sfrcollege.edu.in</b><br>"
            "• <b>Controller of Examinations (COE)</b>: 04562-220389 | Email: <b>coe@sfrcollege.edu.in</b><br>"
            "• <b>Working Hours</b>: 8:30 AM to 5:00 PM (Monday to Saturday, except second Saturdays)."
        ),
        "quick_buttons": ["Admissions", "Departments", "Transport", "Library"],
        "sources": ["SFRC Official Directory 2026"],
        "keywords": "contact phone email address principal coe sivakasi office helpdesk location",
    },
]
