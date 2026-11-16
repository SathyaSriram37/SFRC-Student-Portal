import os
import sqlite3
import httpx
import asyncio

SUPABASE_URL = "https://ketpjyyowmhuzecwzmds.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtldHBqeXlvd21odXplY3d6bWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDYwNTAxMywiZXhwIjoyMTA2MTgxMDEzfQ.C-Z3bj3IUcfq3VaWT7irGWD-Q1x-n9aJ4-24SqrP3Qo"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

async def main():
    conn = sqlite3.connect('college.db')
    c = conn.cursor()

    # Get all users created for Data Science (faculty, students, parents)
    c.execute("""
        SELECT up.id, up.email, up.role, up.full_name, s.register_number, f.employee_id
        FROM user_profiles up
        LEFT JOIN students s ON s.user_id = up.id
        LEFT JOIN faculty f ON f.user_id = up.id
        WHERE up.department_id = '8600e9b3-0e6a-4492-b6ec-d8a56abf677d' 
           OR up.email LIKE '%uds%' 
           OR up.email LIKE '%datascience%'
           OR up.email LIKE '%parent.24uds%'
    """)
    rows = c.fetchall()
    print(f"Syncing {len(rows)} Data Science users with Supabase Auth...")

    async with httpx.AsyncClient() as client:
        # 1. Fetch existing users in Supabase Auth
        list_resp = await client.get(f"{SUPABASE_URL}/auth/v1/admin/users?per_page=100", headers=headers)
        existing_users = {}
        if list_resp.status_code == 200:
            for u in list_resp.json().get("users", []):
                existing_users[u["email"].lower()] = u["id"]

        for row in rows:
            uid, email, role, full_name, reg_no, emp_id = row
            email_lower = email.lower()

            meta = {
                "full_name": full_name,
                "role": role,
            }
            if reg_no:
                meta["register_number"] = reg_no
            if emp_id:
                meta["employee_id"] = emp_id

            if email_lower in existing_users:
                sb_id = existing_users[email_lower]
                # Update user
                await client.put(
                    f"{SUPABASE_URL}/auth/v1/admin/users/{sb_id}",
                    headers=headers,
                    json={
                        "user_metadata": meta,
                        "password": "Sfrc@2026",
                        "email_confirm": True,
                    }
                )
                print(f"Updated: {email} ({role}) -> {sb_id}")
            else:
                # Create user
                resp = await client.post(
                    f"{SUPABASE_URL}/auth/v1/admin/users",
                    headers=headers,
                    json={
                        "email": email_lower,
                        "password": "Sfrc@2026",
                        "email_confirm": True,
                        "user_metadata": meta,
                    }
                )
                if resp.status_code in (200, 201):
                    new_u = resp.json()
                    sb_id = new_u["id"]
                    print(f"Created: {email} ({role}) -> {sb_id}")
                else:
                    print(f"Error creating {email}: {resp.status_code} {resp.text}")

    conn.close()
    print("Sync complete.")

if __name__ == "__main__":
    asyncio.run(main())
