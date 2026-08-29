from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from app.api.dependencies import get_current_user
from app.schemas.profile import CandidateProfileCreate, CandidateProfileBase
from app.services import profile as profile_service

router = APIRouter(prefix="/api/profile", tags=["profile"])

@router.get("", response_model=CandidateProfileBase)
async def get_my_profile(user_id: str = Depends(get_current_user)):
    profile = await profile_service.get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.put("", response_model=CandidateProfileBase)
async def update_my_profile(
    profile_data: CandidateProfileCreate,
    user_id: str = Depends(get_current_user)
):
    profile = await profile_service.upsert_profile(user_id, profile_data)
    return profile

@router.post("/resume", response_model=CandidateProfileBase)
async def upload_my_resume(
    request: Request,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    # Validate content type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    # Check file size (approximate using seek if needed, but usually done via middleware or reading)
    # Simple check: if it's over ~5MB
    MAX_SIZE = 5 * 1024 * 1024
    if file.size and file.size > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")
        
    profile = await profile_service.upload_resume(
        user_id,
        file,
        public_base_url=str(request.base_url),
    )
    return profile
