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
    return True

users_collection = database["users"]
candidate_profiles_collection = database["candidate_profiles"]
outreach_collection = database["outreach"]