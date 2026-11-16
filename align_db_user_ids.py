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
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{SUPABASE_URL}/auth/v1/admin/users?per_page=100", headers=headers)
        if resp.status_code != 200:
            print("Failed to fetch supabase users")
            return
        users = resp.json().get("users", [])

    conn = sqlite3.connect('college.db')
    c = conn.cursor()

    c.execute("PRAGMA foreign_keys = OFF;")

    for u in users:
        email = u["email"].lower()
        sb_id = u["id"]

        # Check existing user_profiles
        c.execute("SELECT id FROM user_profiles WHERE LOWER(email) = ?", (email,))
        row = c.fetchone()
        if row:
            old_id = row[0]
            if old_id != sb_id:
                # Update tables
                c.execute("UPDATE user_profiles SET id = ? WHERE id = ?", (sb_id, old_id))
                c.execute("UPDATE students SET user_id = ? WHERE user_id = ?", (sb_id, old_id))
                c.execute("UPDATE faculty SET user_id = ? WHERE user_id = ?", (sb_id, old_id))
                c.execute("UPDATE parents SET user_id = ? WHERE user_id = ?", (sb_id, old_id))
                c.execute("UPDATE transport_allocations SET user_id = ? WHERE user_id = ?", (sb_id, old_id))
                print(f"Aligned {email}: {old_id} -> {sb_id}")

    c.execute("PRAGMA foreign_keys = ON;")
    conn.commit()
    conn.close()
    print("User ID alignment complete.")

if __name__ == "__main__":
    asyncio.run(main())
