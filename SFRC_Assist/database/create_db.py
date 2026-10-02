import os
import sqlite3

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.join(BASE_DIR, "college.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# =====================================================
# DEPARTMENTS
# =====================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS departments(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    level TEXT NOT NULL,

    category TEXT NOT NULL,

    department_name TEXT NOT NULL,

    hod TEXT,

    description TEXT

)
""")


# =====================================================
# FACULTY
# =====================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS faculty(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    department_name TEXT,

    faculty_name TEXT,

    designation TEXT,

    qualification TEXT,

    email TEXT

)
""")

# =====================================================
# FEES
# =====================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS fees(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    department_name TEXT,

    tuition_fee INTEGER,

    other_fee INTEGER

)
""")

# =====================================================
# Ph.D GUIDES
# =====================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS phd_guides(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    guide_name TEXT,

    department_name TEXT,

    specialization TEXT,

    email TEXT

)
""")

# =====================================================
# TRANSPORT
# =====================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS transport(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    route TEXT,

    timing TEXT,

    driver_name TEXT,

    phone TEXT

)
""")

# =====================================================
# CONTACT
# =====================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS contact(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    office_name TEXT,

    phone TEXT,

    email TEXT,

    address TEXT

)
""")

# =====================================================
# ADMIN
# =====================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS admin(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    username TEXT UNIQUE,

    password TEXT

)
""")

# =====================================================
# FAQ
# =====================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS faq(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    question TEXT,

    answer TEXT

)
""")

# Save Changes
conn.commit()

# Close Connection
conn.close()

print("✅ Database created successfully.")