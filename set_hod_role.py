import asyncio
import sys
sys.path.append(r"d:\SFRC Student Portal\backend")
from app.core.config import settings
import httpx

async def main():
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{base}/auth/v1/admin/users?per_page=100", headers=headers)
        users = r.json().get("users", [])
        for u in users:
            if "hod" in u.get("email", ""):
                print("Found HOD user:", u.get("id"), u.get("email"), u.get("user_metadata"))
                uid = u.get("id")
                res = await client.put(
                    f"{base}/auth/v1/admin/users/{uid}",
                    headers=headers,
                    json={"user_metadata": {"role": "hod", "full_name": "Dr. K. Anitha", "department_id": "8600e9b3-0e6a-4492-b6ec-d8a56abf677d"}},
                )
                print("Updated HOD user_metadata:", res.status_code, res.text)

if __name__ == "__main__":
    asyncio.run(main())
