from datetime import datetime, timezone
import hashlib
import logging
import os
import secrets
import tempfile
from fastapi import UploadFile, HTTPException
# pyrefly: ignore [missing-import]
from appwrite.id import ID
# pyrefly: ignore [missing-import]
from appwrite.input_file import InputFile
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from app.core.appwrite import appwrite_storage
from app.core.security import env_int
from app.core.safe_logging import log_exception
from app.db.mongodb import candidate_profiles_collection
from app.schemas.profile import CandidateProfileCreate

log = logging.getLogger(__name__)
PDF_CONTENT_TYPE = "application/pdf"
UPLOAD_CHUNK_SIZE = 64 * 1024


def _safe_pdf_filename(filename: str | None) -> str:
    cleaned = os.path.basename(filename or "resume.pdf")
    cleaned = cleaned.replace("\r", "").replace("\n", "").replace('"', "")[:255]
    return cleaned or "resume.pdf"


def _public_api_base_url(fallback: str | None = None) -> str:
    """Return the public API origin used in links sent to email recipients."""
    return (os.environ.get("PUBLIC_API_URL") or fallback or "").rstrip("/")


def _create_resume_access_metadata(file_id: str, filename: str, public_base_url: str | None = None) -> dict:
    """Create resume metadata with a bearer URL and only its hash for lookup."""
    token = secrets.token_urlsafe(32)
    metadata = {
        "file_id": file_id,
        "filename": filename,
        "content_type": PDF_CONTENT_TYPE,
        "validated_pdf": True,
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
        if resume.get("validated_pdf") is True and resume.get("content_type") == PDF_CONTENT_TYPE:
            result["resume"] = {
                key: value for key, value in resume.items() if key != "access_token_hash"
            }
        else:
            result["resume"] = None
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
    # Legacy records were not content-validated. Do not create public links for
    # files whose PDF safety cannot be proven.
    if resume.get("validated_pdf") is not True:
        resume.pop("resume_url", None)
        return profile
    if resume.get("access_token_hash") and resume.get("resume_url"):
        return profile

    metadata = _create_resume_access_metadata(
        file_id=resume["file_id"],
        filename=resume.get("filename") or "resume.pdf",
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

def _validate_pdf(path: str) -> None:
    with open(path, "rb") as uploaded:
        if uploaded.read(5) != b"%PDF-":
            raise HTTPException(status_code=400, detail="Uploaded file is not a valid PDF.")
        uploaded.seek(0)
        try:
            reader = PdfReader(uploaded, strict=False)
            if reader.is_encrypted or len(reader.pages) < 1:
                raise HTTPException(status_code=400, detail="Uploaded PDF cannot be processed.")
        except HTTPException:
            raise
        except (PdfReadError, ValueError, TypeError, OSError):
            raise HTTPException(status_code=400, detail="Uploaded file is not a valid PDF.")


async def _stream_upload_to_tempfile(file: UploadFile) -> tuple[str, int]:
    max_size = env_int("MAX_RESUME_SIZE_BYTES", 5 * 1024 * 1024)
    total_size = 0
    temporary = tempfile.NamedTemporaryFile(prefix="reacher-resume-", suffix=".pdf", delete=False)
    path = temporary.name

    try:
        while chunk := await file.read(UPLOAD_CHUNK_SIZE):
            total_size += len(chunk)
            if total_size > max_size:
                raise HTTPException(status_code=413, detail="Resume file is too large.")
            temporary.write(chunk)
        temporary.flush()
    except Exception:
        temporary.close()
        if os.path.exists(path):
            os.unlink(path)
        raise
    finally:
        temporary.close()
        await file.close()

    if total_size == 0:
        os.unlink(path)
        raise HTTPException(status_code=400, detail="Resume file is empty.")
    return path, total_size


async def upload_resume(user_id: str, file: UploadFile, public_base_url: str | None = None) -> dict:
    bucket_id = os.environ.get("APPWRITE_BUCKET_ID")
    if not bucket_id:
        log.error("Resume storage is not configured")
        raise HTTPException(status_code=503, detail="Resume storage is temporarily unavailable.")
        
    path, _ = await _stream_upload_to_tempfile(file)
    try:
        _validate_pdf(path)
        appwrite_input = InputFile.from_path(path)
        appwrite_input.mime_type = PDF_CONTENT_TYPE
        uploaded_file = appwrite_storage.create_file(
            bucket_id=bucket_id,
            file_id=ID.unique(),
            file=appwrite_input,
        )
    except HTTPException:
        raise
    except Exception:
        log_exception(log, "Resume upload failed for an authenticated user")
        raise HTTPException(status_code=502, detail="Resume storage is temporarily unavailable.")
    finally:
        if os.path.exists(path):
            os.unlink(path)
    
    # Prepare metadata for MongoDB
    resume_metadata = _create_resume_access_metadata(
        file_id=uploaded_file.id,
        filename=_safe_pdf_filename(file.filename),
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
