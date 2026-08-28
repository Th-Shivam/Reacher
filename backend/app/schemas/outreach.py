from typing import Optional
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime

class OutreachBase(BaseModel):
    company_name: str = Field(..., description="Name of the target company")
    job_description: str = Field(..., description="The job description or role requirements")

class OutreachCreate(OutreachBase):
    contact_email: EmailStr = Field(..., description="Email of the recruiter or contact person")

class OutreachInDB(OutreachBase):
    id: str = Field(alias="_id")
    clerk_id: str
    contact_email: Optional[EmailStr] = Field(None, description="Email of the recruiter or contact person")
    status: str = Field(default="pending", description="Status of the outreach")
    jd_analysis: Optional[dict] = None
    candidate_analysis: Optional[dict] = None
    company_research: Optional[str] = None
    generated_draft: Optional[str] = None
    draft_review: Optional[dict] = None
    is_saved_in_drafts: Optional[bool] = Field(default=False, description="Whether the draft has been saved to Gmail Drafts")
    pipeline_status: Optional[str] = Field(default="pending", description="Current automated pipeline step")
    pipeline_error: Optional[str] = Field(default=None, description="Error message if pipeline step failed")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
