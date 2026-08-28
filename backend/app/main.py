import os
from dotenv import load_dotenv
from app.db.mongodb import ping_database, users_collection
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from fastapi import Depends, FastAPI, Request
from app.api.dependencies import get_current_user
from app.api.routes.profile import router as profile_router
from app.api.routes.outreach import router as outreach_router
from app.api.routes.gmail import router as gmail_router

from pymongo import ReturnDocument

load_dotenv()

app = FastAPI(title="Reacher API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://reacher-tawny.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile_router)
app.include_router(outreach_router, prefix="/api/outreach", tags=["outreach"])
app.include_router(gmail_router, prefix="/api/gmail", tags=["gmail"])


@app.get("/api/health")
async def health():
    try:
        await ping_database()

        return {
            "status": "ok",
            "service": "reacher-api",
            "database": "connected",
        }

    except Exception as error:
        return {
            "status": "error",
            "service": "reacher-api",
            "database": "disconnected",
            "error": str(error),
        }


@app.get("/api/me")
async def get_me(user_id: str = Depends(get_current_user)):
    now = datetime.now(timezone.utc)

    user = await users_collection.find_one_and_update(
        {"clerk_id": user_id},
        {
            "$setOnInsert": {
                "clerk_id": user_id,
                "created_at": now,
            },
            "$set": {
                "updated_at": now,
            },
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )

    # Convert MongoDB ObjectId to string for JSON serialization
    user["_id"] = str(user["_id"])

    return {
        "message": "Authenticated successfully",
        "user": user,
    }