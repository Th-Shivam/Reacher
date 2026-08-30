import hashlib
import logging
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.core.appwrite import appwrite_storage
from app.core.safe_logging import log_exception
from app.db.mongodb import candidate_profiles_collection


router = APIRouter(prefix="/api/public", tags=["public"])
log = logging.getLogger(__name__)


@router.get("/resume/{token}")
async def view_resume(token: str):
    """Serve a resume through its unguessable, revocable Reacher link."""
    if not token or len(token) > 200:
        raise HTTPException(status_code=404, detail="Resume not found")

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    profile = await candidate_profiles_collection.find_one(
        {"resume.access_token_hash": token_hash},
        {"resume": 1},
    )
    resume = profile.get("resume") if profile else None
    bucket_id = os.environ.get("APPWRITE_BUCKET_ID")
    if (
        not resume
        or not resume.get("file_id")
        or resume.get("validated_pdf") is not True
        or resume.get("content_type") != "application/pdf"
        or not bucket_id
    ):
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        content = appwrite_storage.get_file_view(
            bucket_id=bucket_id,
            file_id=resume["file_id"],
        )
    except Exception:
        log_exception(log, "Validated resume retrieval failed")
        # Do not disclose whether a token or an internal file ID was valid.
        raise HTTPException(status_code=404, detail="Resume not found")

    filename = os.path.basename(str(resume.get("filename") or "resume.pdf"))
    filename = filename.replace("\r", "").replace("\n", "").replace('"', "") or "resume.pdf"
    return Response(
        content=content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
