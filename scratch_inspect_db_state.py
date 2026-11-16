import sqlite3
import json

conn = sqlite3.connect('college.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [row[0] for row in cursor.fetchall()]
print(f"Total tables: {len(tables)}")

# Check key tables row count
counts = {}
for t in tables:
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {t}")
        counts[t] = cursor.fetchone()[0]
    except Exception as e:
        counts[t] = str(e)

print("\n--- Key Table Counts ---")
key_tables = [
    'departments', 'programmes', 'courses', 'students', 'faculty', 
    'parents', 'attendance_records', 'marks', 'enrollments', 
    'timetables', 'transport_routes', 'transport_allocations', 
    'transport_live_tracking', 'audit_logs', 'user_profiles'
]
for kt in key_tables:
    print(f"{kt}: {counts.get(kt, 'TABLE NOT FOUND')}")

# Check Department of Computer Applications (CA)
print("\n--- Departments ---")
cursor.execute("SELECT id, name, code FROM departments WHERE code IN ('CA', 'CS') OR name LIKE '%Computer%'")
for r in cursor.fetchall():
    print(r)

# Check programmes under CA / CS
print("\n--- Programmes under CA/CS ---")
cursor.execute("SELECT id, name, code, department_id, degree_level FROM programmes WHERE code LIKE '%CA%' OR code LIKE '%CS%' OR name LIKE '%Computer%'")
for r in cursor.fetchall():
    print(r)

# Check courses under CA / CS
print("\n--- Courses under CA/CS ---")
cursor.execute("SELECT id, code, title, department_id, semester, credits, faculty_id FROM courses LIMIT 10")
for r in cursor.fetchall():
    print(r[0], r[1], r[2][:30].encode('ascii', 'replace').decode(), r[3], r[4], r[5], r[6])

# Check transport allocations columns
print("\n--- transport_allocations schema ---")
cursor.execute("PRAGMA table_info(transport_allocations)")
for r in cursor.fetchall():
    print(r[1], r[2])

# Check parents schema
print("\n--- parents schema ---")
cursor.execute("PRAGMA table_info(parents)")
for r in cursor.fetchall():
    print(r[1], r[2])

# Check user_profiles roles
print("\n--- user_profiles role breakdown ---")
cursor.execute("SELECT role, COUNT(*) FROM user_profiles GROUP BY role")
for r in cursor.fetchall():
    print(r[0], r[1])

