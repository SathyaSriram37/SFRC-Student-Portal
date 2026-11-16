import os
import sys
import sqlite3
import uuid
import httpx
import asyncio

SUPABASE_URL = "https://ketpjyyowmhuzecwzmds.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtldHBqeXlvd21odXplY3d6bWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDYwNTAxMywiZXhwIjoyMTA2MTgxMDEzfQ.C-Z3bj3IUcfq3VaWT7irGWD-Q1x-n9aJ4-24SqrP3Qo"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

def init_tables(conn):
    c = conn.cursor()
    # 1. Lab Inventory
    c.execute("""
        CREATE TABLE IF NOT EXISTS lab_inventory (
            id TEXT PRIMARY KEY,
            lab_name TEXT NOT NULL,
            department_id TEXT,
            item_name TEXT NOT NULL,
            category TEXT DEFAULT 'Workstation',
            serial_number TEXT,
            specs TEXT,
            quantity INTEGER DEFAULT 1,
            status TEXT DEFAULT 'Functional', -- Functional, Under Maintenance, Decommissioned
            condition TEXT DEFAULT 'Good',
            assigned_room TEXT DEFAULT 'LAB-DS-01',
            last_serviced_date TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 2. Lab Logbook
    c.execute("""
        CREATE TABLE IF NOT EXISTS lab_logbook (
            id TEXT PRIMARY KEY,
            lab_name TEXT NOT NULL,
            course_id TEXT,
            course_code TEXT,
            course_title TEXT,
            batch_name TEXT NOT NULL,
            date TEXT NOT NULL,
            session TEXT NOT NULL, -- FN | AN
            students_present INTEGER DEFAULT 10,
            faculty_in_charge TEXT NOT NULL,
            experiment_title TEXT NOT NULL,
            remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 3. Lab Maintenance Tickets
    c.execute("""
        CREATE TABLE IF NOT EXISTS lab_maintenance_tickets (
            id TEXT PRIMARY KEY,
            lab_name TEXT NOT NULL,
            item_name TEXT NOT NULL,
            serial_number TEXT,
            issue_description TEXT NOT NULL,
            priority TEXT DEFAULT 'Medium', -- Low, Medium, High, Critical
            status TEXT DEFAULT 'Pending', -- Pending, In Progress, Resolved
            reported_by TEXT NOT NULL,
            reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP,
            resolution_notes TEXT
        )
    """)
    conn.commit()
    print("Lab tables initialized successfully.")

def seed_lab_data(conn):
    c = conn.cursor()
    dept_id = "8600e9b3-0e6a-4492-b6ec-d8a56abf677d" # Data Science

    c.execute("DELETE FROM lab_inventory WHERE department_id = ?", (dept_id,))
    c.execute("DELETE FROM lab_logbook WHERE lab_name LIKE '%Data Science%'")
    c.execute("DELETE FROM lab_maintenance_tickets WHERE lab_name LIKE '%Data Science%'")

    # Inventory
    items = [
        (str(uuid.uuid4()), "Data Science & Advanced ML Lab (LAB-DS-01)", dept_id, "Dell Precision 3660 Workstations (Batch A)", "Workstation", "WS-DS-001 to 015", "Intel Core i9-13900, 64GB DDR5, NVIDIA RTX 4080 16GB, 2TB NVMe", 15, "Functional", "Excellent", "LAB-DS-01", "2026-09-15"),
        (str(uuid.uuid4()), "Data Science & Advanced ML Lab (LAB-DS-01)", dept_id, "Dell Precision 3660 Workstations (Batch B)", "Workstation", "WS-DS-016 to 030", "Intel Core i9-13900, 64GB DDR5, NVIDIA RTX 4080 16GB, 2TB NVMe", 15, "Functional", "Excellent", "LAB-DS-01", "2026-09-15"),
        (str(uuid.uuid4()), "Data Science & Advanced ML Lab (LAB-DS-01)", dept_id, "HP Z4 G5 Data Science Towers", "Tower", "WS-DS-031 to 040", "Intel Xeon W-2400, 32GB RAM, NVIDIA RTX A4000, 1TB SSD", 10, "Functional", "Good", "LAB-DS-01", "2026-08-20"),
        (str(uuid.uuid4()), "Data Science & Advanced ML Lab (LAB-DS-01)", dept_id, "NVIDIA RTX 4080 16GB GPU Replacement Unit", "Hardware", "GPU-DS-991", "PCIe 4.0 x16, 16GB GDDR6X VRAM", 1, "Under Maintenance", "Faulty PCIe Link", "LAB-DS-01", "2026-10-02"),
        (str(uuid.uuid4()), "Data Science & Advanced ML Lab (LAB-DS-01)", dept_id, "Cisco Catalyst 48-Port Gigabit PoE+ Managed Switch", "Network", "SW-DS-48P-01", "48-Port GbE PoE+, 4x 10G SFP+ uplinks", 1, "Functional", "Excellent", "Server Rack A", "2026-07-10"),
        (str(uuid.uuid4()), "Data Science & Advanced ML Lab (LAB-DS-01)", dept_id, "APC Smart-UPS On-Line 10kVA Rackmount Power Unit", "Power", "UPS-DS-10KVA", "10kVA / 10kW Double-conversion Online UPS", 1, "Functional", "Good", "Power Room 1", "2026-08-01"),
    ]
    c.executemany("""
        INSERT INTO lab_inventory (id, lab_name, department_id, item_name, category, serial_number, specs, quantity, status, condition, assigned_room, last_serviced_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, items)

    # Logbook entries
    logbook_rows = [
        (str(uuid.uuid4()), "Data Science & Advanced ML Lab (LAB-DS-01)", "crs-ds-24uds4p", "24UDS4P", "Data Science & Advanced ML Practical Lab", "Batch A (24UDS001 - 24UDS010)", "2026-10-12", "FN", 10, "Dr. K. Anitha", "Deep Neural Networks with PyTorch & CUDA Model Training", "All 10 systems operated with active GPU acceleration. No hardware bottlenecks."),
        (str(uuid.uuid4()), "Data Science & Advanced ML Lab (LAB-DS-01)", "crs-ds-24uds4p", "24UDS4P", "Data Science & Advanced ML Practical Lab", "Batch A (24UDS001 - 24UDS010)", "2026-10-09", "AN", 10, "Dr. K. Anitha", "Big Data Analytics with Apache PySpark & Distributed Datasets", "Spark cluster simulated locally across nodes WS-01 to WS-10 successfully."),
        (str(uuid.uuid4()), "Data Science & Advanced ML Lab (LAB-DS-01)", "crs-ds-24uds4p", "24UDS4P", "Data Science & Advanced ML Practical Lab", "Batch A (24UDS001 - 24UDS010)", "2026-10-05", "FN", 10, "Dr. K. Anitha", "Feature Engineering, PCA & Clustering Algorithms", "Completed dataset pipeline exercises."),
    ]
    c.executemany("""
        INSERT INTO lab_logbook (id, lab_name, course_id, course_code, course_title, batch_name, date, session, students_present, faculty_in_charge, experiment_title, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, logbook_rows)

    # Maintenance Tickets
    tkt_rows = [
        ("TKT-DS-2026-001", "Data Science & Advanced ML Lab (LAB-DS-01)", "Dell Precision 3660 Workstation (WS-DS-009)", "WS-DS-009", "GPU driver crash and display freeze during Epoch 8 of Transformer model training.", "High", "In Progress", "Mr. R. Muthuraj (Lab Assistant)", "2026-10-11 11:30:00", None, "Dell Onsite Support technician scheduled for GPU reseating."),
        ("TKT-DS-2026-002", "Data Science & Advanced ML Lab (LAB-DS-01)", "Terminal HDMI Cable Port 4", "CAB-HDMI-04", "Intermittent video flicker on secondary monitor of Instructor console.", "Low", "Resolved", "Mr. R. Muthuraj (Lab Assistant)", "2026-10-08 09:15:00", "2026-10-08 14:00:00", "Replaced with certified 4K 60Hz Gold-plated HDMI 2.1 cable from department stock."),
    ]
    c.executemany("""
        INSERT INTO lab_maintenance_tickets (id, lab_name, item_name, serial_number, issue_description, priority, status, reported_by, reported_at, resolved_at, resolution_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, tkt_rows)

    conn.commit()
    print("Seed lab inventory, logbook, and maintenance tickets saved.")

async def sync_hierarchy_users(conn):
    c = conn.cursor()
    # Define Institutional Staff Hierarchy
    # All are role = 'faculty' in user_profiles, but distinct designations!
    users_to_provision = [
        # 1. Principal
        {
            "email": "principal@sfrc.edu.in",
            "full_name": "Dr. M. Pushpavalli",
            "role": "faculty",
            "designation": "Principal",
            "employee_id": "EMP-PRI-001",
            "department_id": "8600e9b3-0e6a-4492-b6ec-d8a56abf677d", # Linked to administration
            "phone": "+91 94421 11999",
            "qualification": "M.Sc., M.Phil., Ph.D.",
            "specialization": "Higher Education Administration & Mathematical Sciences",
        },
        # 2. HOD (Data Science)
        {
            "email": "hod.datascience@sfrc.edu.in",
            "full_name": "Dr. K. Anitha",
            "role": "faculty",
            "designation": "Head of Department",
            "employee_id": "EMP-DS-001",
            "department_id": "8600e9b3-0e6a-4492-b6ec-d8a56abf677d",
            "phone": "+91 94421 88321",
            "qualification": "M.Sc., M.Phil., Ph.D.",
            "specialization": "Data Science & Machine Learning",
        },
        # 3. Teaching Staff 1
        {
            "email": "staff.subbulakshmi@sfrc.edu.in",
            "full_name": "Mrs. P. Subbulakshmi",
            "role": "faculty",
            "designation": "Assistant Professor",
            "employee_id": "EMP-DS-002",
            "department_id": "8600e9b3-0e6a-4492-b6ec-d8a56abf677d",
            "phone": "+91 94421 88322",
            "qualification": "M.Sc., M.Phil.",
            "specialization": "Python Programming & Deep Learning",
        },
        # 4. Teaching Staff 2
        {
            "email": "staff.senthil@sfrc.edu.in",
            "full_name": "Mr. M. Senthil",
            "role": "faculty",
            "designation": "Assistant Professor",
            "employee_id": "EMP-DS-003",
            "department_id": "8600e9b3-0e6a-4492-b6ec-d8a56abf677d",
            "phone": "+91 94421 88323",
            "qualification": "M.Sc., M.Phil.",
            "specialization": "Big Data Analytics & Cloud Databases",
        },
        # 5. Lab Assistant (Data Science)
        {
            "email": "lab.datascience@sfrc.edu.in",
            "full_name": "Mr. R. Muthuraj",
            "role": "faculty",
            "designation": "Lab Assistant",
            "employee_id": "EMP-LAB-DS-01",
            "department_id": "8600e9b3-0e6a-4492-b6ec-d8a56abf677d",
            "phone": "+91 98421 77101",
            "qualification": "B.Sc. Computer Science, Diploma in Hardware & Networking",
            "specialization": "AI GPU Clusters & Laboratory Systems Maintenance",
        },
        # 6. Other Staff Member: Librarian
        {
            "email": "librarian@sfrc.edu.in",
            "full_name": "Dr. S. Meenakshi",
            "role": "faculty",
            "designation": "Librarian",
            "employee_id": "EMP-LIB-001",
            "department_id": "8600e9b3-0e6a-4492-b6ec-d8a56abf677d",
            "phone": "+91 94421 55001",
            "qualification": "M.L.I.Sc., Ph.D.",
            "specialization": "Digital Library Systems & Institutional Repositories",
        },
    ]

    async with httpx.AsyncClient() as client:
        # Fetch existing users in Supabase Auth
        list_resp = await client.get(f"{SUPABASE_URL}/auth/v1/admin/users?per_page=100", headers=headers)
        existing_sb = {}
        if list_resp.status_code == 200:
            for u in list_resp.json().get("users", []):
                existing_sb[u["email"].lower()] = u

        for u in users_to_provision:
            email_lower = u["email"].lower()
            meta = {
                "full_name": u["full_name"],
                "role": u["role"],
                "designation": u["designation"],
                "employee_id": u["employee_id"],
                "department_id": u["department_id"],
            }

            user_id = None
            if email_lower in existing_sb:
                sb_obj = existing_sb[email_lower]
                user_id = sb_obj["id"]
                # Update user in Supabase
                up_resp = await client.put(
                    f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                    headers=headers,
                    json={
                        "user_metadata": meta,
                        "password": "Sfrc@2026",
                    }
                )
                print(f"Updated Supabase Auth user {u['email']}: {up_resp.status_code}")
            else:
                # Create user in Supabase
                cr_resp = await client.post(
                    f"{SUPABASE_URL}/auth/v1/admin/users",
                    headers=headers,
                    json={
                        "email": u["email"],
                        "password": "Sfrc@2026",
                        "email_confirm": True,
                        "user_metadata": meta,
                    }
                )
                if cr_resp.status_code in [200, 201]:
                    user_id = cr_resp.json()["id"]
                    print(f"Created Supabase Auth user {u['email']} -> ID {user_id}")
                else:
                    print(f"Failed to create {u['email']} in Supabase: {cr_resp.status_code} {cr_resp.text}")
                    continue

            # Upsert into user_profiles in SQLite
            up_exists = c.execute("SELECT id FROM user_profiles WHERE id = ? OR email = ?", (user_id, u["email"])).fetchone()
            if up_exists:
                c.execute("""
                    UPDATE user_profiles SET
                        id = ?,
                        email = ?,
                        role = ?,
                        full_name = ?,
                        phone = ?,
                        department_id = ?,
                        is_active = true
                    WHERE id = ? OR email = ?
                """, (user_id, u["email"], u["role"], u["full_name"], u["phone"], u["department_id"], user_id, u["email"]))
            else:
                c.execute("""
                    INSERT INTO user_profiles (id, email, role, full_name, phone, department_id, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (user_id, u["email"], u["role"], u["full_name"], u["phone"], u["department_id"]))

            # Upsert into faculty in SQLite
            f_exists = c.execute("SELECT id FROM faculty WHERE user_id = ? OR employee_id = ?", (user_id, u["employee_id"])).fetchone()
            if f_exists:
                c.execute("""
                    UPDATE faculty SET
                        user_id = ?,
                        employee_id = ?,
                        designation = ?,
                        department_id = ?,
                        qualification = ?,
                        specialization = ?,
                        is_active = true
                    WHERE id = ?
                """, (user_id, u["employee_id"], u["designation"], u["department_id"], u["qualification"], u["specialization"], f_exists[0]))
            else:
                c.execute("""
                    INSERT INTO faculty (id, user_id, employee_id, designation, department_id, is_active, qualification, specialization, created_at)
                    VALUES (?, ?, ?, ?, ?, true, ?, ?, CURRENT_TIMESTAMP)
                """, (f"fac-{u['employee_id'].lower()}", user_id, u["employee_id"], u["designation"], u["department_id"], u["qualification"], u["specialization"]))

    conn.commit()
    print("Hierarchy staff provisioned and synchronized with Supabase Auth & SQLite.")

async def main():
    conn = sqlite3.connect('college.db')
    init_tables(conn)
    seed_lab_data(conn)
    await sync_hierarchy_users(conn)
    conn.close()

if __name__ == "__main__":
    asyncio.run(main())
