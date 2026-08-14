from datetime import datetime, timezone
import os
from fastapi import UploadFile, HTTPException
from appwrite.id import ID
from appwrite.input_file import InputFile
from app.core.appwrite import appwrite_storage
from app.db.mongodb import candidate_profiles_collection
from app.schemas.profile import CandidateProfileCreate

async def get_profile(user_id: str) -> dict | None:
    profile = await candidate_profiles_collection.find_one({"clerk_id": user_id})
    if profile:
        profile["_id"] = str(profile["_id"])
    return profile

async def upsert_profile(user_id: str, profile_data: CandidateProfileCreate) -> dict:
    data = profile_data.model_dump()
    data["clerk_id"] = user_id
    data["updated_at"] = datetime.now(timezone.utc)
    
    existing = await candidate_profiles_collection.find_one({"clerk_id": user_id})
    if existing:
        await candidate_profiles_collection.update_one(
            {"clerk_id": user_id},
            {"$set": data}
        )
    else:
        data["created_at"] = data["updated_at"]
        await candidate_profiles_collection.insert_one(data)
        
    return await get_profile(user_id)

async def upload_resume(user_id: str, file: UploadFile) -> dict:
    bucket_id = os.environ.get("APPWRITE_BUCKET_ID")
    if not bucket_id:
        raise HTTPException(status_code=500, detail="Appwrite bucket ID not configured")
        
    # Read file content
    content = await file.read()
    
    # Generate unique ID for the file
    file_id = ID.unique()
    
    # Upload to Appwrite
    appwrite_file = InputFile.from_bytes(
        content,
        filename=file.filename or "resume.pdf",
        mime_type=file.content_type
    )
    
    # We use synchronous call for Appwrite SDK, could run in executor ideally but this is fine for now
    uploaded_file = appwrite_storage.create_file(
        bucket_id=bucket_id,
        file_id=file_id,
        file=appwrite_file
    )
    
    # Prepare metadata for MongoDB
    resume_metadata = {
        "file_id": uploaded_file.id,
        "filename": file.filename or "resume.pdf",
        "content_type": file.content_type
    }
    
    # Upsert the profile with this metadata
    # Check if profile exists
    existing = await candidate_profiles_collection.find_one({"clerk_id": user_id})
    now = datetime.now(timezone.utc)
    
    if existing:
        await candidate_profiles_collection.update_one(
            {"clerk_id": user_id},
            {"$set": {"resume": resume_metadata, "updated_at": now}}
        )
    else:
        new_profile = {
            "clerk_id": user_id,
            "name": "",
            "headline": "",
            "skills": [],
            "projects": [],
            "experience": [],
            "education": [],
            "resume": resume_metadata,
            "created_at": now,
            "updated_at": now
        }
        await candidate_profiles_collection.insert_one(new_profile)
        
    return await get_profile(user_id)
