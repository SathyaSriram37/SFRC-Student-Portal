"""
Provision complete B.Sc. Data Science demonstration environment in college.db:
1. Department of Data Science (DS) & B.Sc. Data Science (UDS) Programme
2. 4 Core Courses (24UDS41, 24UDS42, 24UDS43, 24UDS4P)
3. HOD & 2 Faculty profiles in Department of Data Science
4. Faculty Course Assignments (courses.faculty_id & timetables)
5. 10 Student Profiles (24UDS001 to 24UDS010) with enrollments
6. 10 Linked Parent Profiles
7. Real attendance records across courses
8. Real CIA1 and CIA2 marks with varying performance
9. Transport pass allocations across bus routes
"""
import sqlite3
import uuid
import json
from datetime import datetime, date, timedelta

conn = sqlite3.connect('college.db')
c = conn.cursor()

now_iso = datetime.now().isoformat()
today_str = date.today().isoformat()

# 1. Department & Programme Verification
DEPT_ID = '8600e9b3-0e6a-4492-b6ec-d8a56abf677d'
PROG_ID = 'ac7ed91d-d438-4f06-8177-a8cabbd67986'

c.execute("UPDATE departments SET name = 'Department of Data Science', code = 'DS' WHERE id = ?", (DEPT_ID,))
c.execute("UPDATE programmes SET name = 'B.Sc. Data Science', code = 'UDS', degree_level = 'UG', department_id = ?, sanctioned_intake = 60, regulation_batch = '2024 - 2027 (OBE)' WHERE id = ?", (DEPT_ID, PROG_ID))

print("1. Department & Programme verified.")

# 2. Setup Faculty: 1 HOD + 2 Staff
FACULTY_DATA = [
    {
        "user_id": "usr-ds-hod-anitha",
        "email": "hod.datascience@sfrc.edu.in",
        "full_name": "Dr. K. Anitha",
        "phone": "+91 94431 10001",
        "employee_id": "EMP-DS-001",
        "designation": "Head of the Department",
        "qualification": "Ph.D. Computer Science & Machine Learning",
        "specialization": "Statistical Learning & AI Systems",
        "role": "faculty",
    },
    {
        "user_id": "usr-ds-fac-subbu",
        "email": "staff.subbulakshmi@sfrc.edu.in",
        "full_name": "Mrs. P. Subbulakshmi",
        "phone": "+91 94431 10002",
        "employee_id": "EMP-DS-002",
        "designation": "Assistant Professor",
        "qualification": "M.Sc., M.Phil. Data Analytics",
        "specialization": "Python & Computational Analytics",
        "role": "faculty",
    },
    {
        "user_id": "usr-ds-fac-senthil",
        "email": "staff.senthil@sfrc.edu.in",
        "full_name": "Mr. M. Senthil",
        "phone": "+91 94431 10003",
        "employee_id": "EMP-DS-003",
        "designation": "Assistant Professor",
        "qualification": "M.Tech., Ph.D. Distributed Computing",
        "specialization": "Big Data Frameworks & Cloud Pipelines",
        "role": "faculty",
    },
]

fac_id_map = {}
for f in FACULTY_DATA:
    # user_profiles
    c.execute("""
        INSERT INTO user_profiles (id, email, role, full_name, phone, department_id, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name, role = excluded.role, phone = excluded.phone, department_id = excluded.department_id, is_active = 1
    """, (f["user_id"], f["email"], f["role"], f["full_name"], f["phone"], DEPT_ID, now_iso, now_iso))

    # faculty
    fac_db_id = f"fac-{f['employee_id'].lower()}"
    fac_id_map[f["employee_id"]] = fac_db_id
    c.execute("""
        INSERT INTO faculty (id, user_id, employee_id, designation, department_id, qualification, specialization, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET designation = excluded.designation, qualification = excluded.qualification, specialization = excluded.specialization, is_active = 1
    """, (fac_db_id, f["user_id"], f["employee_id"], f["designation"], DEPT_ID, f["qualification"], f["specialization"], now_iso))

print(f"2. {len(FACULTY_DATA)} Faculty & HOD profiles created/verified.")

# 3. Setup 4 Core Courses for B.Sc. Data Science Semester 4
COURSES_DATA = [
    {
        "id": "crs-ds-24uds41",
        "code": "24UDS41",
        "title": "Python for Data Science & Numerical Computing",
        "semester": 4,
        "credits": 4,
        "hours_per_week": 5,
        "course_type": "Major Core",
        "faculty_id": fac_id_map["EMP-DS-002"],  # Mrs. P. Subbulakshmi
        "period": 1,
        "room": "DS Lab 1",
    },
    {
        "id": "crs-ds-24uds42",
        "code": "24UDS42",
        "title": "Machine Learning & Statistical Models",
        "semester": 4,
        "credits": 4,
        "hours_per_week": 5,
        "course_type": "Major Core",
        "faculty_id": fac_id_map["EMP-DS-001"],  # Dr. K. Anitha (HOD)
        "period": 2,
        "room": "DS Room 201",
    },
    {
        "id": "crs-ds-24uds43",
        "code": "24UDS43",
        "title": "Big Data Analytics & Database Architectures",
        "semester": 4,
        "credits": 4,
        "hours_per_week": 5,
        "course_type": "Major Core",
        "faculty_id": fac_id_map["EMP-DS-003"],  # Mr. M. Senthil
        "period": 3,
        "room": "DS Room 202",
    },
    {
        "id": "crs-ds-24uds4p",
        "code": "24UDS4P",
        "title": "Data Science & Advanced ML Practical Lab",
        "semester": 4,
        "credits": 2,
        "hours_per_week": 4,
        "course_type": "Core Practical",
        "faculty_id": fac_id_map["EMP-DS-001"],  # Dr. K. Anitha (HOD)
        "period": 4,
        "room": "AI & Big Data Center",
    },
]

for crs in COURSES_DATA:
    c.execute("""
        INSERT INTO courses (id, code, title, department_id, programme_id, semester, credits, hours_per_week, course_type, syllabus_status, faculty_id, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?, 1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET code = excluded.code, title = excluded.title, department_id = excluded.department_id, programme_id = excluded.programme_id, semester = excluded.semester, credits = excluded.credits, faculty_id = excluded.faculty_id, is_active = 1
    """, (crs["id"], crs["code"], crs["title"], DEPT_ID, PROG_ID, crs["semester"], crs["credits"], crs["hours_per_week"], crs["course_type"], crs["faculty_id"], now_iso, now_iso))

    # Add / update timetable slot
    tt_id = f"tt-{crs['code'].lower()}"
    c.execute("""
        INSERT INTO timetables (id, course_id, programme_id, faculty_id, day_of_week, period_number, start_time, end_time, room, semester, created_at)
        VALUES (?, ?, ?, ?, 1, ?, '09:30 AM', '10:30 AM', ?, 4, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET faculty_id = excluded.faculty_id, room = excluded.room
    """, (tt_id, crs["id"], PROG_ID, crs["faculty_id"], crs["period"], crs["room"]))

print(f"3. {len(COURSES_DATA)} Data Science courses created and assigned to Faculty.")

# 4. Setup 10 Students under B.Sc. Data Science
STUDENTS_DATA = [
    {"reg": "24UDS001", "name": "Abinaya M", "email": "abinaya.24uds001@sfrc.edu.in", "phone": "+91 98421 20001", "route": "rt-01", "stop": "Sivakasi Old Bus Stand", "seat": "02A"},
    {"reg": "24UDS002", "name": "Bhavani S", "email": "bhavani.24uds002@sfrc.edu.in", "phone": "+91 98421 20002", "route": "rt-01", "stop": "Coronation Colony", "seat": "04B"},
    {"reg": "24UDS003", "name": "Chitra Devi R", "email": "chitra.24uds003@sfrc.edu.in", "phone": "+91 98421 20003", "route": "rt-02", "stop": "Thiruthangal Railway Station", "seat": "06A"},
    {"reg": "24UDS004", "name": "Deepalakshmi K", "email": "deepa.24uds004@sfrc.edu.in", "phone": "+91 98421 20004", "route": "rt-02", "stop": "Thiruthangal Bus Stand", "seat": "08B"},
    {"reg": "24UDS005", "name": "Eswari P", "email": "eswari.24uds005@sfrc.edu.in", "phone": "+91 98421 20005", "route": "rt-03", "stop": "Sattur Bus Terminal", "seat": "11A"},
    {"reg": "24UDS006", "name": "Gayathri N", "email": "gayathri.24uds006@sfrc.edu.in", "phone": "+91 98421 20006", "route": "rt-03", "stop": "Nalli Junction", "seat": "14B"},
    {"reg": "24UDS007", "name": "Harini V", "email": "harini.24uds007@sfrc.edu.in", "phone": "+91 98421 20007", "route": "rt-01", "stop": "Gandhi Nagar Corner", "seat": "16A"},
    {"reg": "24UDS008", "name": "Ishwarya T", "email": "ishwarya.24uds008@sfrc.edu.in", "phone": "+91 98421 20008", "route": "rt-02", "stop": "Sengamalanagar", "seat": "18B"},
    {"reg": "24UDS009", "name": "Janani S", "email": "janani.24uds009@sfrc.edu.in", "phone": "+91 98421 20009", "route": "rt-03", "stop": "Padanthal", "seat": "20A"},
    {"reg": "24UDS010", "name": "Kausalya M", "email": "kausalya.24uds010@sfrc.edu.in", "phone": "+91 98421 20010", "route": "rt-01", "stop": "Viswanatham Road", "seat": "22B"},
]

student_db_ids = {}

for s in STUDENTS_DATA:
    u_id = f"usr-ds-{s['reg'].lower()}"
    st_id = f"stu-ds-{s['reg'].lower()}"
    student_db_ids[s["reg"]] = st_id

    # user_profiles
    c.execute("""
        INSERT INTO user_profiles (id, email, role, full_name, phone, department_id, is_active, created_at, updated_at)
        VALUES (?, ?, 'student', ?, ?, ?, 1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name, phone = excluded.phone, department_id = excluded.department_id, is_active = 1
    """, (u_id, s["email"], s["name"], s["phone"], DEPT_ID, now_iso, now_iso))

    # students
    c.execute("""
        INSERT INTO students (id, user_id, register_number, current_semester, department_id, programme_id, section, batch, batch_year, is_active, created_at)
        VALUES (?, ?, ?, 4, ?, ?, 'A', '2024 - 2027', '2024 - 2027', 1, ?)
        ON CONFLICT(id) DO UPDATE SET register_number = excluded.register_number, current_semester = 4, department_id = excluded.department_id, programme_id = excluded.programme_id, is_active = 1
    """, (st_id, u_id, s["reg"], DEPT_ID, PROG_ID, now_iso))

    # Enroll in all 4 courses
    for crs in COURSES_DATA:
        enr_id = f"enr-{s['reg'].lower()}-{crs['code'].lower()}"
        c.execute("""
            INSERT INTO enrollments (id, student_id, course_id, semester, academic_year, status, created_at)
            VALUES (?, ?, ?, 4, '2025-2026', 'enrolled', CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET status = 'enrolled'
        """, (enr_id, st_id, crs["id"]))

    # 5. Link Parent
    p_uid = f"usr-par-{s['reg'].lower()}"
    p_id = f"par-ds-{s['reg'].lower()}"
    p_name = f"Mr. {s['name'].split()[-1]} (Parent of {s['name']})"
    p_email = f"parent.{s['reg'].lower()}@sfrc.edu.in"

    c.execute("""
        INSERT INTO user_profiles (id, email, role, full_name, phone, is_active, created_at, updated_at)
        VALUES (?, ?, 'parent', ?, '+91 94421 99000', 1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name, role = 'parent', is_active = 1
    """, (p_uid, p_email, p_name, now_iso, now_iso))

    c.execute("""
        INSERT INTO parents (id, user_id, relation, ward_student_id, is_active, created_at)
        VALUES (?, ?, 'Parent / Guardian', ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET ward_student_id = excluded.ward_student_id, is_active = 1
    """, (p_id, p_uid, st_id))

    # 6. Allocate Transport Bus Pass
    ta_id = f"ta-ds-{s['reg'].lower()}"
    pass_no = f"SFRC-BP-2026-{s['reg']}"
    c.execute("DELETE FROM transport_allocations WHERE user_id = ? OR user_id = ?", (u_id, st_id))
    c.execute("""
        INSERT INTO transport_allocations (id, user_id, user_type, route_id, boarding_stop_id, boarding_stop_name, seat_number, pass_number, status, valid_until, academic_year, created_at)
        VALUES (?, ?, 'student', ?, ?, ?, ?, ?, 'active', 'May 31, 2027', '2025-2026', CURRENT_TIMESTAMP)
    """, (ta_id, u_id, s["route"], f"st-{s['stop'][:6]}", s["stop"], s["seat"], pass_no))

print(f"4. 10 Students, enrollments, 10 parents, and transport passes created.")

# 7. Record Attendance in SQLite (12 dates per course)
base_date = date.today() - timedelta(days=20)
c.execute("DELETE FROM attendance_records WHERE student_id IN (SELECT id FROM students WHERE department_id = ?)", (DEPT_ID,))

att_count = 0
for day_idx in range(12):
    curr_date = (base_date + timedelta(days=day_idx)).isoformat()
    # Skip weekends
    if (base_date + timedelta(days=day_idx)).weekday() >= 5:
        continue

    for crs in COURSES_DATA:
        faculty_marker = crs["faculty_id"]
        for idx, s in enumerate(STUDENTS_DATA):
            st_id = student_db_ids[s["reg"]]
            # Introduce realistic attendance: Students 1-8 have 90-100%, Student 9 has 80%, Student 10 has 65% (below 75% warning!)
            if idx == 9 and (day_idx % 3 == 0):
                att_status = "absent"
            elif idx == 8 and (day_idx % 5 == 0):
                att_status = "absent"
            elif day_idx == 4 and idx == 4:
                att_status = "od"
            else:
                att_status = "present"

            ar_id = f"ar-ds-{s['reg'].lower()}-{crs['code'].lower()}-{curr_date}-FN"
            c.execute("""
                INSERT INTO attendance_records (id, student_id, course_id, date, session, status, marked_by, created_at)
                VALUES (?, ?, ?, ?, 'FN', ?, ?, CURRENT_TIMESTAMP)
            """, (ar_id, st_id, crs["id"], curr_date, att_status, faculty_marker))
            att_count += 1

print(f"5. {att_count} real attendance records inserted into attendance_records.")

# 8. Record Marks in SQLite (CIA1 and CIA2 for all 4 courses)
c.execute("DELETE FROM marks WHERE student_id IN (SELECT id FROM students WHERE department_id = ?)", (DEPT_ID,))

# Marks profiles per student:
# Top scorers (40-48), Mid scorers (32-38), 1 struggle student (18-24 for CIA1 to show real pass/fail analytics)
student_base_marks = [46, 44, 48, 38, 42, 35, 45, 39, 32, 18]

marks_count = 0
for crs_idx, crs in enumerate(COURSES_DATA):
    fac_marker = crs["faculty_id"]
    for idx, s in enumerate(STUDENTS_DATA):
        st_id = student_db_ids[s["reg"]]
        base_m = student_base_marks[idx]

        # CIA1 (Max 50)
        m_cia1 = min(50.0, max(15.0, float(base_m + (crs_idx * 1.5) - 2.0)))
        m_id1 = f"mk-{s['reg'].lower()}-{crs['code'].lower()}-cia1"
        c.execute("""
            INSERT INTO marks (id, student_id, course_id, assessment_type, marks_obtained, max_marks, academic_year, semester, entered_by, created_at)
            VALUES (?, ?, ?, 'CIA1', ?, 50.0, '2025-2026', 4, ?, CURRENT_TIMESTAMP)
        """, (m_id1, st_id, crs["id"], m_cia1, fac_marker))
        marks_count += 1

        # CIA2 (Max 50, improvement)
        m_cia2 = min(50.0, max(18.0, float(m_cia1 + 2.5)))
        m_id2 = f"mk-{s['reg'].lower()}-{crs['code'].lower()}-cia2"
        c.execute("""
            INSERT INTO marks (id, student_id, course_id, assessment_type, marks_obtained, max_marks, academic_year, semester, entered_by, created_at)
            VALUES (?, ?, ?, 'CIA2', ?, 50.0, '2025-2026', 4, ?, CURRENT_TIMESTAMP)
        """, (m_id2, st_id, crs["id"], m_cia2, fac_marker))
        marks_count += 1

print(f"6. {marks_count} assessment marks inserted into marks table.")

# 9. Update occupied seats on transport routes
c.execute("""
    UPDATE transport_routes
    SET occupied_seats = (SELECT COUNT(*) FROM transport_allocations WHERE route_id = transport_routes.id)
""")

conn.commit()
conn.close()

print("\nSUCCESS: All B.Sc. Data Science demonstration data committed to college.db.")
