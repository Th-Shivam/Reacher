import os
from dotenv import load_dotenv
from app.db.mongodb import ping_database, users_collection
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from fastapi import Depends, FastAPI, Request
from app.api.dependencies import get_current_user
from app.api.routes.profile import router as profile_router
from app.api.routes.outreach import router as outreach_router

load_dotenv()

app = FastAPI(title="Reacher API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile_router)
app.include_router(outreach_router, prefix="/api/outreach", tags=["outreach"])


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
    # Find existing user in MongoDB
    user = await users_collection.find_one({"clerk_id": user_id})
    
    if not user:
        # Create a new user document if they don't exist
        new_user = {
            "clerk_id": user_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await users_collection.insert_one(new_user)
        user = new_user
        user["_id"] = result.inserted_id

    # Convert MongoDB ObjectId to string for JSON serialization
    user["_id"] = str(user["_id"])

    return {
        "message": "Authenticated successfully",
        "user": user,
    }