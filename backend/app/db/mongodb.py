import os

from dotenv import load_dotenv
from pymongo import AsyncMongoClient

load_dotenv()

MONGODB_URL = os.environ["MONGODB_URL"]
MONGODB_DATABASE = os.environ["MONGODB_DATABASE"]

client = AsyncMongoClient(MONGODB_URL)

database = client[MONGODB_DATABASE]


async def ping_database() -> bool:
    await client.admin.command("ping")
    await users_collection.create_index("clerk_id", unique=True)
    await outreach_controls_collection.create_index("expires_at", expireAfterSeconds=0)
    await outreach_locks_collection.create_index("expires_at", expireAfterSeconds=0)
    await outreach_idempotency_collection.create_index("expires_at", expireAfterSeconds=0)
    return True

users_collection = database["users"]
candidate_profiles_collection = database["candidate_profiles"]
outreach_collection = database["outreach"]
outreach_controls_collection = database["outreach_controls"]
outreach_locks_collection = database["outreach_locks"]
outreach_idempotency_collection = database["outreach_idempotency"]
