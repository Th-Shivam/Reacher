from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Header, Request
from typing import List
import json
import logging
# pyrefly: ignore [missing-import]
from bson import ObjectId
from app.api.dependencies import get_current_user
from app.schemas.outreach import OutreachCreate, OutreachInDB
from app.services import outreach as outreach_service
from app.services import profile as profile_service
from app.services.gmail import create_gmail_draft
from app.services.pipeline import run_full_pipeline
from app.services.abuse import (
    acquire_outreach_lock,
    claim_idempotency,
    complete_idempotency,
    delete_idempotency,
    idempotency_conflict,
    release_outreach_lock,
    reserve_outreach_capacity,
    rollback_outreach_capacity,
)
from app.core.security import payload_fingerprint
from app.core.safe_logging import log_exception
from app.db.mongodb import outreach_collection, candidate_profiles_collection
# pyrefly: ignore [missing-import]
from app.agents.jd_analyzer import JDAnalyzerAgent
from app.agents.candidate_analyzer import CandidateAnalyzerAgent
from app.agents.outreach_writer import OutreachWriterAgent, ensure_resume_link
from app.agents.research_agent import ResearchAgent
from app.agents.reviewer_agent import ReviewerAgent

router = APIRouter()
log = logging.getLogger(__name__)


def _processing_error(operation: str) -> HTTPException:
    log_exception(log, "%s failed", operation)
    return HTTPException(
        status_code=500,
        detail="Something went wrong while processing the request.",
    )

@router.post("", response_model=OutreachInDB)
async def create_campaign(
    outreach: OutreachCreate,
    background_tasks: BackgroundTasks,
    idempotency_key: str = Header(
        ...,
        alias="Idempotency-Key",
        min_length=8,
        max_length=200,
    ),
    user_id: str = Depends(get_current_user),
):
    """
    Create a new outreach campaign and immediately start the full
    automated pipeline in the background.
    """
    fingerprint = payload_fingerprint(outreach.model_dump(mode="json"))
    record_id, existing = await claim_idempotency(
        user_id,
        f"outreach:{idempotency_key}",
        fingerprint,
    )
    if existing:
        if existing.get("fingerprint") != fingerprint:
            raise HTTPException(
                status_code=409,
                detail="The idempotency key was already used for a different request.",
            )
        if existing.get("status") == "completed" and existing.get("result_type") == "outreach":
            return existing["result"]
        raise idempotency_conflict()

    lock_token = await acquire_outreach_lock(user_id)
    if not lock_token:
        await delete_idempotency(record_id)
        raise HTTPException(
            status_code=409,
            detail="Another outreach pipeline is already running for this user.",
        )

    reserved = False
    try:
        await reserve_outreach_capacity(user_id)
        reserved = True
        campaign = await outreach_service.create_outreach_campaign(user_id, outreach)
        await complete_idempotency(record_id, campaign, "outreach")
        background_tasks.add_task(
            run_full_pipeline,
            campaign["_id"],
            user_id,
            lock_token,
        )
        return campaign
    except HTTPException:
        await release_outreach_lock(user_id, lock_token)
        await delete_idempotency(record_id)
        raise
    except Exception:
        if reserved:
            await rollback_outreach_capacity(user_id)
        await release_outreach_lock(user_id, lock_token)
        await delete_idempotency(record_id)
        raise _processing_error("Outreach campaign creation")


@router.get("", response_model=List[OutreachInDB])
async def list_campaigns(user_id: str = Depends(get_current_user)):
    """
    Get all outreach campaigns for the current user
    """
    return await outreach_service.get_outreach_campaigns(user_id)

@router.post("/{campaign_id}/analyze-jd")
async def analyze_job_description(campaign_id: str, user_id: str = Depends(get_current_user)):
    """
    Analyzes the job description for a specific outreach campaign using the JDAnalyzerAgent.
    """
    try:
        campaign = await outreach_collection.find_one({"_id": ObjectId(campaign_id), "clerk_id": user_id})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Campaign ID")
        
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Optimization: If we already have the JD analysis, don't run AI again
    if campaign.get("jd_analysis"):
        return {
            "status": "success",
            "campaign_id": campaign_id,
            "analysis": campaign["jd_analysis"],
            "cached": True
        }

    # Initialize the agent
    try:
        agent = JDAnalyzerAgent()
    except ValueError:
        raise _processing_error("JD analyzer initialization")

    # Run the agent
    try:
        raw_analysis = agent.analyze(campaign["job_description"])
        
        # We asked the agent to return JSON string, so we'll try to parse it
        # Sometimes LLMs wrap json in markdown blocks anyway, so we clean it just in case
        clean_json = raw_analysis.replace("```json", "").replace("```", "").strip()
        analysis_data = json.loads(clean_json)
        
        # Save the analysis back to MongoDB
        await outreach_collection.update_one(
            {"_id": ObjectId(campaign_id)},
            {"$set": {
                "jd_analysis": analysis_data,
                "status": "jd_analyzed"
            }}
        )
        
        return {
            "status": "success",
            "campaign_id": campaign_id,
            "analysis": analysis_data
        }
    except Exception:
        raise _processing_error("JD analysis")

@router.post("/{campaign_id}/analyze-candidate")
async def analyze_candidate_profile(campaign_id: str, user_id: str = Depends(get_current_user)):
    """
    Analyzes the candidate's profile and saves it to the outreach campaign.
    """
    try:
        campaign = await outreach_collection.find_one({"_id": ObjectId(campaign_id), "clerk_id": user_id})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Campaign ID")
        
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    profile = await candidate_profiles_collection.find_one({"clerk_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    # Optimization: If we already have the candidate analysis, don't run AI again
    if campaign.get("candidate_analysis"):
        return {
            "status": "success",
            "campaign_id": campaign_id,
            "analysis": campaign["candidate_analysis"],
            "cached": True
        }

    # Initialize the agent
    try:
        agent = CandidateAnalyzerAgent()
    except ValueError:
        raise _processing_error("Candidate analyzer initialization")

    # Strip sensitive or unnecessary info from profile dump before sending to AI
    profile_data = {
        "name": profile.get("name", ""),
        "headline": profile.get("headline", ""),
        "skills": profile.get("skills", []),
        "projects": profile.get("projects", []),
        "experience": profile.get("experience", []),
        "education": profile.get("education", [])
    }
    
    # Run the agent
    try:
        raw_analysis = agent.analyze(json.dumps(profile_data))
        clean_json = raw_analysis.replace("```json", "").replace("```", "").strip()
        analysis_data = json.loads(clean_json)
        
        # Save the analysis back to MongoDB
        await outreach_collection.update_one(
            {"_id": ObjectId(campaign_id)},
            {"$set": {
                "candidate_analysis": analysis_data,
                "status": "candidate_analyzed"
            }}
        )
        
        return {
            "status": "success",
            "campaign_id": campaign_id,
            "analysis": analysis_data
        }
    except Exception:
        raise _processing_error("Candidate analysis")

@router.post("/{campaign_id}/research-company")
async def research_company(campaign_id: str, user_id: str = Depends(get_current_user)):
    """
    Researches the company using the ResearchAgent (Tool Use).
    """
    try:
        campaign = await outreach_collection.find_one({"_id": ObjectId(campaign_id), "clerk_id": user_id})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Campaign ID")
        
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Optimization: If we already have the research, don't run AI again
    if campaign.get("company_research"):
        return {
            "status": "success",
            "campaign_id": campaign_id,
            "research": campaign["company_research"],
            "cached": True
        }

    try:
        agent = ResearchAgent()
    except ValueError:
        raise _processing_error("Research agent initialization")

    try:
        research_data = agent.research(campaign["company_name"])
        
        await outreach_collection.update_one(
            {"_id": ObjectId(campaign_id)},
            {"$set": {
                "company_research": research_data,
                "status": "company_researched"
            }}
        )
        
        return {
            "status": "success",
            "campaign_id": campaign_id,
            "research": research_data
        }
    except Exception:
        raise _processing_error("Company research")

@router.post("/{campaign_id}/generate-draft")
async def generate_outreach_draft(
    campaign_id: str,
    request: Request,
    user_id: str = Depends(get_current_user),
):
    """
    Generates a personalized cold email using JD and Candidate analyses.
    """
    try:
        campaign = await outreach_collection.find_one({"_id": ObjectId(campaign_id), "clerk_id": user_id})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Campaign ID")
        
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    jd_analysis = campaign.get("jd_analysis")
    candidate_analysis = campaign.get("candidate_analysis")
    company_research = campaign.get("company_research")
    
    if not jd_analysis or not candidate_analysis or not company_research:
        raise HTTPException(
            status_code=400, 
            detail="Missing analysis data. Please analyze JD, Candidate, and Research the Company first."
        )

    # Fetch user profile to provide contact info
    user_profile = await profile_service.ensure_resume_link(
        user_id,
        public_base_url=str(request.base_url),
    )
    profile_data = {}
    if user_profile:
        # Exclude internal DB IDs to keep prompt clean
        profile_data = {
            "name": user_profile.get("name", ""),
            "email": user_profile.get("email", ""),
            "phone": user_profile.get("phone", ""),
            "github_url": user_profile.get("github", ""),
            "linkedin_url": user_profile.get("linkedin", ""),
            "x_url": user_profile.get("x_url", ""),
            "resume_url": (user_profile.get("resume") or {}).get("resume_url", ""),
        }

    # Reuse an existing draft, but upgrade older drafts with the resume link.
    if campaign.get("generated_draft"):
        draft = ensure_resume_link(campaign["generated_draft"], profile_data)
        if draft != campaign["generated_draft"]:
            await outreach_collection.update_one(
                {"_id": ObjectId(campaign_id)},
                {"$set": {"generated_draft": draft}},
            )
        return {
            "status": "success",
            "campaign_id": campaign_id,
            "draft": draft,
            "cached": True
        }

    try:
        agent = OutreachWriterAgent()
    except ValueError:
        raise _processing_error("Outreach writer initialization")

    try:
        draft = ensure_resume_link(agent.write(
            json.dumps(jd_analysis),
            json.dumps(candidate_analysis),
            profile_data,
            campaign.get("company_name", "the company"),
            company_research
        ), profile_data)
        
        await outreach_collection.update_one(
            {"_id": ObjectId(campaign_id)},
            {"$set": {
                "generated_draft": draft,
                "status": "draft_generated"
            }}
        )
        
        return {
            "status": "success",
            "campaign_id": campaign_id,
            "draft": draft
        }
    except Exception:
        raise _processing_error("Draft generation")

@router.post("/{campaign_id}/review-draft")
async def review_outreach_draft(campaign_id: str, user_id: str = Depends(get_current_user)):
    """
    Evaluates the generated email draft using the ReviewerAgent.
    """
    try:
        campaign = await outreach_collection.find_one({"_id": ObjectId(campaign_id), "clerk_id": user_id})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Campaign ID")
        
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    draft = campaign.get("generated_draft")
    jd = campaign.get("job_description")
    
    if not draft:
        raise HTTPException(status_code=400, detail="No draft found to review. Generate a draft first.")

    # Optimization: if review exists, just return it
    if campaign.get("draft_review"):
        return {
            "status": "success",
            "campaign_id": campaign_id,
            "review": campaign["draft_review"],
            "cached": True
        }

    try:
        agent = ReviewerAgent()
    except ValueError:
        raise _processing_error("Draft reviewer initialization")

    try:
        raw_review = agent.review(jd, draft)
        clean_json = raw_review.replace("```json", "").replace("```", "").strip()
        review_data = json.loads(clean_json)
        
        await outreach_collection.update_one(
            {"_id": ObjectId(campaign_id)},
            {"$set": {
                "draft_review": review_data,
                "status": "draft_reviewed"
            }}
        )
        
        return {
            "status": "success",
            "campaign_id": campaign_id,
            "review": review_data
        }
    except Exception:
        raise _processing_error("Draft review")
