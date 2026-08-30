from typing import Annotated, List, Optional
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

ProfileEntry = Annotated[str, StringConstraints(max_length=10_000)]

class ResumeMetadata(BaseModel):
    file_id: str
    filename: str = Field(default="resume.pdf", max_length=255)
    content_type: str = Field(default="application/pdf", pattern="^application/pdf$")
    resume_url: Optional[str] = Field(default=None, max_length=2_000)

class CandidateProfileBase(BaseModel):
    name: str = Field(..., max_length=200, description="Full name of the candidate")
    headline: str = Field(..., max_length=300, description="Professional headline or current role")
    skills: List[str] = Field(default_factory=list, max_length=100, description="List of skills")
    projects: List[str] = Field(default_factory=list, max_length=100, description="List of notable projects")
    experience: List[str] = Field(default_factory=list, max_length=100, description="List of work experiences")
    education: List[str] = Field(default_factory=list, max_length=100, description="List of educational background")
    phone: Optional[str] = Field(default="", max_length=100, description="Phone number")
    email: Optional[str] = Field(default="", max_length=320, description="Contact email")
    github: Optional[str] = Field(default="", max_length=2_000, description="GitHub profile URL")
    linkedin: Optional[str] = Field(default="", max_length=2_000, description="LinkedIn profile URL")
    x_url: Optional[str] = Field(default="", max_length=2_000, description="X (Twitter) profile URL")
    resume: Optional[ResumeMetadata] = Field(default=None, description="Server-managed resume metadata")

class CandidateProfileCreate(BaseModel):
    """Client-writable profile fields; resume metadata is server-owned."""
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., max_length=200)
    headline: str = Field(..., max_length=300)
    skills: List[ProfileEntry] = Field(default_factory=list, max_length=100)
    projects: List[ProfileEntry] = Field(default_factory=list, max_length=100)
    experience: List[ProfileEntry] = Field(default_factory=list, max_length=100)
    education: List[ProfileEntry] = Field(default_factory=list, max_length=100)
    phone: Optional[str] = Field(default="", max_length=100)
    email: Optional[str] = Field(default="", max_length=320)
    github: Optional[str] = Field(default="", max_length=2_000)
    linkedin: Optional[str] = Field(default="", max_length=2_000)
    x_url: Optional[str] = Field(default="", max_length=2_000)

    @model_validator(mode="after")
    def validate_profile_text_size(self):
        text_size = sum(
            len(value)
            for values in (self.skills, self.projects, self.experience, self.education)
            for value in values
        )
        if text_size > 30_000:
            raise ValueError("Profile text exceeds the 30000 character limit")
        return self

class CandidateProfileUpdate(CandidateProfileCreate):
    pass

class CandidateProfileInDB(CandidateProfileBase):
    clerk_id: str
    model_config = ConfigDict(from_attributes=True)
