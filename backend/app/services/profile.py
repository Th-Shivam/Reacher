from datetime import datetime, timezone
import hashlib
import os
import secrets
from fastapi import UploadFile, HTTPException
from appwrite.id import ID
from appwrite.input_file import InputFile
from app.core.appwrite import appwrite_storage
from app.db.mongodb import candidate_profiles_collection
from app.schemas.profile import CandidateProfileCreate


def _public_api_base_url(fallback: str | None = None) -> str:
    """Return the public API origin used in links sent to email recipients."""
    return (os.environ.get("PUBLIC_API_URL") or fallback or "").rstrip("/")


def _create_resume_access_metadata(file_id: str, filename: str, content_type: str | None, public_base_url: str | None = None) -> dict:
    """Create resume metadata with a bearer URL and only its hash for lookup."""
    token = secrets.token_urlsafe(32)
    metadata = {
        "file_id": file_id,
        "filename": filename,
        "content_type": content_type or "application/pdf",
        "access_token_hash": hashlib.sha256(token.encode("utf-8")).hexdigest(),
    }
    base_url = _public_api_base_url(public_base_url)
    if base_url:
        metadata["resume_url"] = f"{base_url}/api/public/resume/{token}"
    return metadata


def _public_profile(profile: dict) -> dict:
    """Remove token hashes before returning profile data to an authenticated client."""
    result = dict(profile)
    resume = result.get("resume")
    if isinstance(resume, dict):
        result["resume"] = {
            key: value for key, value in resume.items() if key != "access_token_hash"
        }
    return result

async def get_profile(user_id: str) -> dict | None:
    profile = await candidate_profiles_collection.find_one({"clerk_id": user_id})
    if profile:
        profile["_id"] = str(profile["_id"])
        return _public_profile(profile)
    return None


async def ensure_resume_link(user_id: str, public_base_url: str | None = None) -> dict | None:
    """Backfill a link for resumes uploaded before tokenized links were introduced."""
    profile = await candidate_profiles_collection.find_one({"clerk_id": user_id})
    if not profile:
        return None

    resume = profile.get("resume")
    if not isinstance(resume, dict) or not resume.get("file_id"):
        return profile
    if resume.get("access_token_hash") and resume.get("resume_url"):
        return profile

    metadata = _create_resume_access_metadata(
        file_id=resume["file_id"],
        filename=resume.get("filename") or "resume.pdf",
        content_type=resume.get("content_type") or "application/pdf",
        public_base_url=public_base_url,
    )
    await candidate_profiles_collection.update_one(
        {"clerk_id": user_id},
        {"$set": {"resume": metadata, "updated_at": datetime.now(timezone.utc)}},
    )
    profile["resume"] = metadata
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

async def upload_resume(user_id: str, file: UploadFile, public_base_url: str | None = None) -> dict:
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
    resume_metadata = _create_resume_access_metadata(
        file_id=uploaded_file.id,
        filename=file.filename or "resume.pdf",
        content_type=file.content_type,
        public_base_url=public_base_url,
    )
    
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
