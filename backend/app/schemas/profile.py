from typing import List, Optional
from pydantic import BaseModel, Field

class CandidateProfileBase(BaseModel):
    name: str = Field(..., description="Full name of the candidate")
    headline: str = Field(..., description="Professional headline or current role")
    skills: List[str] = Field(default_factory=list, description="List of skills")
    projects: List[str] = Field(default_factory=list, description="List of notable projects")
    experience: List[str] = Field(default_factory=list, description="List of work experiences")
    education: List[str] = Field(default_factory=list, description="List of educational background")
    resume: Optional[dict] = Field(default=None, description="Resume file metadata")

class CandidateProfileCreate(CandidateProfileBase):
    pass

class CandidateProfileUpdate(CandidateProfileBase):
    pass

class CandidateProfileInDB(CandidateProfileBase):
    clerk_id: str
    
    class Config:
        from_attributes = True
