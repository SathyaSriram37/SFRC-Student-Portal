import asyncio
import httpx
from app.core.config import settings

async def main():
    base = settings.supabase_url.rstrip('/')
    url = f"{base}/auth/v1/admin/users?per_page=100"
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        users = res.json().get("users", [])
        target = next((u for u in users if u.get("email") == "ganga.faculty@sfrc.ac.in"), None)
        if target:
            print("Found user:", target["id"], target["email"])
            up_url = f"{base}/auth/v1/admin/users/{target['id']}"
            up_res = await client.put(
                up_url,
                headers=headers,
                json={
                    "password": "Sfrc@2026",
                    "email_confirm": True,
                    "user_metadata": {"role": "faculty", "full_name": "Ganga"},
                },
            )
            print("Password updated:", up_res.status_code)
        else:
            print("Creating user...")
            c_res = await client.post(
                f"{base}/auth/v1/admin/users",
                headers=headers,
                json={
                    "email": "ganga.faculty@sfrc.ac.in",
                    "password": "Sfrc@2026",
                    "email_confirm": True,
                    "user_metadata": {"role": "faculty", "full_name": "Ganga"},
                },
            )
            print("Created:", c_res.status_code)

if __name__ == "__main__":
    asyncio.run(main())
