"""Seed all 19 official departments and degree programmes for The Standard Fireworks Rajaratnam College for Women (SFRC), Sivakasi."""
import sqlite3
import uuid
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "college.db")

DEPARTMENTS = [
    ("TAM", "Department of Tamil"),
    ("ENG", "Department of English"),
    ("HIST", "Department of History"),
    ("COM", "Department of Commerce"),
    ("COM-PA", "Department of Commerce (Professional Accounting)"),
    ("BBA", "Department of Business Administration"),
    ("MATH", "Department of Mathematics"),
    ("PHY", "Department of Physics"),
    ("CHEM", "Department of Chemistry"),
    ("BOT", "Department of Botany"),
    ("MBIO", "Department of Microbiology"),
    ("ND", "Department of Nutrition and Dietetics"),
    ("CS", "Department of Computer Science"),
    ("CA", "Department of Computer Applications"),
    ("DS", "Department of Data Science"),
    ("CDF", "Department of Costume Design & Fashion"),
    ("PSY", "Department of Psychology"),
    ("GEO", "Department of Geography"),
    ("PED", "Department of Physical Education"),
]

PROGRAMMES = [
    # Tamil
    ("B.A. Tamil", "UTAM", "UG", "TAM", 60),
    ("M.A. Tamil", "PTAM", "PG", "TAM", 30),
    ("Ph.D. Tamil", "RDTAM", "PhD", "TAM", 10),
    # English
    ("B.A. English", "UENG", "UG", "ENG", 60),
    ("M.A. English", "PENG", "PG", "ENG", 35),
    ("Ph.D. English", "RDENG", "PhD", "ENG", 10),
    # History
    ("B.A. History", "UHIST", "UG", "HIST", 60),
    ("M.A. History", "PHIST", "PG", "HIST", 25),
    ("Ph.D. History", "RDHIST", "PhD", "HIST", 8),
    # Commerce
    ("B.Com (General - Aided)", "UCOM-AID", "UG", "COM", 70),
    ("B.Com (Computer Applications - SF)", "UCOM-CA", "UG", "COM", 65),
    ("M.Com (Computer Applications)", "PCOM", "PG", "COM", 35),
    ("Ph.D. Commerce", "RDCOM", "PhD", "COM", 12),
    # Commerce PA
    ("B.Com (Professional Accounting)", "UCOM-PA", "UG", "COM-PA", 60),
    # BBA
    ("Bachelor of Business Administration (BBA)", "UBBA", "UG", "BBA", 60),
    # Mathematics
    ("B.Sc. Mathematics", "UMATH", "UG", "MATH", 60),
    ("M.Sc. Mathematics", "PMATH", "PG", "MATH", 35),
    ("Ph.D. Mathematics", "RDMATH", "PhD", "MATH", 10),
    # Physics
    ("B.Sc. Physics", "UPHY", "UG", "PHY", 45),
    ("M.Sc. Physics", "PPHY", "PG", "PHY", 25),
    ("Ph.D. Physics", "RDPHY", "PhD", "PHY", 8),
    # Chemistry
    ("B.Sc. Chemistry", "UCHEM", "UG", "CHEM", 50),
    ("M.Sc. Chemistry", "PCHEM", "PG", "CHEM", 25),
    ("Ph.D. Chemistry", "RDCHEM", "PhD", "CHEM", 10),
    # Botany
    ("B.Sc. Botany", "UBOT", "UG", "BOT", 45),
    ("M.Sc. Botany", "PBOT", "PG", "BOT", 20),
    ("Ph.D. Botany", "RDBOT", "PhD", "BOT", 8),
    # Microbiology
    ("B.Sc. Microbiology", "UMBIO", "UG", "MBIO", 45),
    ("M.Sc. Microbiology", "PMBIO", "PG", "MBIO", 25),
    # Nutrition & Dietetics
    ("B.Sc. Nutrition and Dietetics", "UND", "UG", "ND", 45),
    ("M.Sc. Food & Nutrition", "PND", "PG", "ND", 20),
    # Computer Science
    ("B.Sc. Computer Science (Aided)", "UCS-AID", "UG", "CS", 50),
    ("B.Sc. Computer Science (SF)", "UCS-SF", "UG", "CS", 60),
    ("M.Sc. Computer Science", "PCS", "PG", "CS", 30),
    ("Ph.D. Computer Science", "RDCS", "PhD", "CS", 12),
    # Computer Applications
    ("Bachelor of Computer Applications (BCA)", "UBCA", "UG", "CA", 60),
    ("Master of Computer Applications (MCA)", "PMCA", "PG", "CA", 60),
    # Data Science
    ("B.Sc. Data Science", "UDS", "UG", "DS", 50),
    ("M.Sc. Data Science", "PDS", "PG", "DS", 25),
    # Costume Design & Fashion
    ("B.Sc. Costume Design & Fashion", "UCDF", "UG", "CDF", 45),
    ("Diploma in Costume Design & Fashion", "DCDF", "Diploma", "CDF", 30),
    # Psychology
    ("B.Sc. Psychology", "UPSY", "UG", "PSY", 50),
    ("M.Sc. Psychology", "PPSY", "PG", "PSY", 25),
    # Geography
    ("B.Sc. Geography", "UGEO", "UG", "GEO", 45),
    # Physical Education
    ("Certificate in Physical Education", "CPED", "Diploma", "PED", 40),
]

COURSES_SAMPLE = [
    # Tamil
    ("TAM101", "இக்காலக் கவிதை மற்றும் உரைநடை", "TAM", "UTAM", 1, 4, 5, "Major Core"),
    ("TAM102", "தொல்காப்பியம் - எழுத்ததிகாரம்", "TAM", "UTAM", 2, 4, 5, "Major Core"),
    # English
    ("ENG101", "British Literature (Chaucer to Milton)", "ENG", "UENG", 1, 4, 5, "Major Core"),
    ("ENG102", "Indian Writing in English", "ENG", "UENG", 1, 4, 4, "Major Core"),
    # History
    ("HIS101", "History of Ancient India (up to 1206 A.D.)", "HIST", "UHIST", 1, 4, 5, "Major Core"),
    # Commerce
    ("COM101", "Financial Accounting I", "COM", "UCOM-AID", 1, 5, 6, "Major Core"),
    ("COM102", "Business Organization & Management", "COM", "UCOM-AID", 1, 4, 5, "Major Core"),
    ("CPA101", "Corporate Accounting & Standards", "COM-PA", "UCOM-PA", 1, 5, 6, "Major Core"),
    # BBA
    ("BBA101", "Principles of Modern Management", "BBA", "UBBA", 1, 4, 5, "Major Core"),
    ("BBA102", "Business Communication & Ethics", "BBA", "UBBA", 1, 3, 4, "Allied"),
    # Mathematics
    ("MAT101", "Classical Algebra & Trigonometry", "MATH", "UMATH", 1, 5, 6, "Major Core"),
    ("MAT102", "Differential Calculus & Analytical Geometry", "MATH", "UMATH", 1, 5, 6, "Major Core"),
    # Physics
    ("PHY101", "Properties of Matter & Sound", "PHY", "UPHY", 1, 4, 4, "Major Core"),
    ("PHY102", "Thermal Physics & Statistical Mechanics", "PHY", "UPHY", 1, 4, 4, "Major Core"),
    # Chemistry
    ("CHE101", "General Chemistry I (Inorganic & Organic)", "CHEM", "UCHEM", 1, 4, 4, "Major Core"),
    # Botany
    ("BOT101", "Plant Diversity I (Algae, Fungi & Bryophytes)", "BOT", "UBOT", 1, 4, 4, "Major Core"),
    # Microbiology
    ("MBI101", "General Microbiology & Microbial Physiology", "MBIO", "UMBIO", 1, 4, 4, "Major Core"),
    # Nutrition
    ("NUT101", "Food Science & Human Nutrition", "ND", "UND", 1, 4, 4, "Major Core"),
    # Computer Science
    ("CSC101", "Programming in Python & Problem Solving", "CS", "UCS-AID", 1, 4, 4, "Major Core"),
    ("CSC102", "Data Structures & Algorithm Analysis", "CS", "UCS-AID", 2, 4, 5, "Major Core"),
    # Computer Applications
    ("BCA101", "Object-Oriented Programming with Java", "CA", "UBCA", 1, 4, 5, "Major Core"),
    ("BCA102", "Relational Database Management Systems", "CA", "UBCA", 2, 4, 5, "Major Core"),
    # Data Science
    ("DSC101", "Foundations of Data Science & Statistics", "DS", "UDS", 1, 4, 5, "Major Core"),
    # CDF
    ("CDF101", "Fashion Concept & Garment Designing", "CDF", "UCDF", 1, 4, 5, "Major Core"),
    # Psychology
    ("PSY101", "Introduction to General Psychology", "PSY", "UPSY", 1, 4, 5, "Major Core"),
    # Geography
    ("GEO101", "Physical Geography & Climatology", "GEO", "UGEO", 1, 4, 5, "Major Core"),
]

def seed():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    dept_id_map = {}

    print("--- Seeding 19 Departments ---")
    for code, name in DEPARTMENTS:
        # Check if already exists by code
        c.execute("SELECT id FROM departments WHERE code = ?", (code,))
        row = c.fetchone()
        if row:
            dept_id = row[0]
            c.execute("UPDATE departments SET name = ? WHERE id = ?", (name, dept_id))
        else:
            dept_id = str(uuid.uuid4())
            c.execute(
                "INSERT INTO departments (id, name, code) VALUES (?, ?, ?)",
                (dept_id, name, code)
            )
        dept_id_map[code] = dept_id
        print(f"  [OK] {code} - {name} ({dept_id})")

    print("\n--- Seeding 40+ Programmes ---")
    prog_id_map = {}
    for name, code, degree, dept_code, intake in PROGRAMMES:
        dept_id = dept_id_map.get(dept_code)
        c.execute("SELECT id FROM programmes WHERE code = ?", (code,))
        row = c.fetchone()
        if row:
            prog_id = row[0]
            c.execute(
                "UPDATE programmes SET name = ?, degree_level = ?, department_id = ?, sanctioned_intake = ?, is_active = 1 WHERE id = ?",
                (name, degree, dept_id, intake, prog_id)
            )
        else:
            prog_id = str(uuid.uuid4())
            c.execute(
                """INSERT INTO programmes (id, name, code, degree_level, department_id, sanctioned_intake, regulation_batch, is_active)
                   VALUES (?, ?, ?, ?, ?, ?, '2023 - 2026 (OBE)', 1)""",
                (prog_id, name, code, degree, dept_id, intake)
            )
        prog_id_map[code] = prog_id
        print(f"  [OK] {code} - {name} ({degree})")

    print("\n--- Seeding Departmental Courses ---")
    for code, title, dept_code, prog_code, sem, credits, hours, c_type in COURSES_SAMPLE:
        dept_id = dept_id_map.get(dept_code)
        prog_id = prog_id_map.get(prog_code)
        c.execute("SELECT id FROM courses WHERE code = ?", (code,))
        row = c.fetchone()
        if row:
            c_id = row[0]
            c.execute(
                "UPDATE courses SET title = ?, department_id = ?, programme_id = ?, semester = ?, credits = ?, hours_per_week = ?, course_type = ? WHERE id = ?",
                (title, dept_id, prog_id, sem, credits, hours, c_type, c_id)
            )
        else:
            c_id = str(uuid.uuid4())
            c.execute(
                """INSERT INTO courses (id, code, title, department_id, programme_id, semester, credits, hours_per_week, course_type, syllabus_status, is_active)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', 1)""",
                (c_id, code, title, dept_id, prog_id, sem, credits, hours, c_type)
            )
        try:
            print(f"  [OK] {code} - {title}")
        except Exception:
            print(f"  [OK] {code}")

    conn.commit()
    conn.close()
    print("\nSuccessfully seeded all 19 official SFRC departments and degree programmes!")

if __name__ == "__main__":
    seed()
