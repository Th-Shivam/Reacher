import os
import asyncio
from dotenv import load_dotenv
from clerk_backend_api import Clerk

load_dotenv("app/.env")
load_dotenv(".env")

async def main():
    clerk = Clerk(bearer_auth=os.environ["CLERK_SECRET_KEY"])
    try:
        users_resp = clerk.users.list()
        users = users_resp.data if hasattr(users_resp, 'data') else users_resp
        
        for u in users:
            print("User:", u.id)
            try:
                tokens = clerk.users.get_o_auth_access_token(user_id=u.id, provider="oauth_google")
                print("Tokens:", tokens)
            except Exception as e:
                print("Error fetching token:", e)
    except Exception as e:
        print("Error listing users:", e)

if __name__ == "__main__":
    asyncio.run(main())
