"""
Automated outreach pipeline.

Runs the full sequence for a campaign in the background:
  1. Analyze JD
  2. Analyze Candidate Profile
  3. Research Company
  4. Generate Draft
  5. Push to Gmail Drafts (if Gmail is connected)

Each step writes its result and a `pipeline_status` field to MongoDB so the
frontend can poll for live progress.
"""

import json
import os
import logging
from datetime import datetime, timezone

from bson import ObjectId  # pyrefly: ignore [missing-import]
from clerk_backend_api import Clerk  # pyrefly: ignore [missing-import]

from app.db.mongodb import outreach_collection, candidate_profiles_collection
from app.agents.jd_analyzer import JDAnalyzerAgent
from app.agents.candidate_analyzer import CandidateAnalyzerAgent
from app.agents.research_agent import ResearchAgent
from app.agents.outreach_writer import OutreachWriterAgent
from app.services.gmail import create_gmail_draft

log = logging.getLogger(__name__)


async def _set_status(campaign_id: str, status: str, extra: dict | None = None):
    """Write pipeline_status (and any extra fields) to MongoDB."""
    payload = {
        "pipeline_status": status,
        "updated_at": datetime.now(timezone.utc),
    }
    if extra:
        payload.update(extra)
    await outreach_collection.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": payload},
    )


async def run_full_pipeline(campaign_id: str, user_id: str) -> None:
    """
    Background task — runs the complete outreach pipeline for one campaign.
    Called immediately after campaign creation.
    """
    log.info(f"[Pipeline] Starting for campaign {campaign_id}")

    try:
        # ── 0. Fetch campaign ──────────────────────────────────────────────
        campaign = await outreach_collection.find_one({"_id": ObjectId(campaign_id)})
        if not campaign:
            log.error(f"[Pipeline] Campaign {campaign_id} not found")
            return

        # ── 1. Analyze JD ─────────────────────────────────────────────────
        await _set_status(campaign_id, "analyzing_jd")
        try:
            agent = JDAnalyzerAgent()
            raw = agent.analyze(campaign["job_description"])
            clean = raw.replace("```json", "").replace("```", "").strip()
            jd_analysis = json.loads(clean)
            await _set_status(campaign_id, "jd_done", {"jd_analysis": jd_analysis})
            log.info(f"[Pipeline] JD analysis done for {campaign_id}")
        except Exception as e:
            await _set_status(campaign_id, "failed", {"pipeline_error": f"JD Analysis failed: {e}"})
            log.error(f"[Pipeline] JD analysis failed: {e}")
            return

        # ── 2. Analyze Candidate Profile ───────────────────────────────────
        await _set_status(campaign_id, "analyzing_candidate")
        try:
            profile = await candidate_profiles_collection.find_one({"clerk_id": user_id})
            if not profile:
                raise ValueError("No candidate profile found. Please complete your profile first.")
            profile_data = {
                "name": profile.get("name", ""),
                "headline": profile.get("headline", ""),
                "skills": profile.get("skills", []),
                "projects": profile.get("projects", []),
                "experience": profile.get("experience", []),
                "education": profile.get("education", []),
            }
            candidate_agent = CandidateAnalyzerAgent()
            raw2 = candidate_agent.analyze(json.dumps(profile_data))
            clean2 = raw2.replace("```json", "").replace("```", "").strip()
            candidate_analysis = json.loads(clean2)
            await _set_status(campaign_id, "candidate_done", {"candidate_analysis": candidate_analysis})
            log.info(f"[Pipeline] Candidate analysis done for {campaign_id}")
        except Exception as e:
            await _set_status(campaign_id, "failed", {"pipeline_error": f"Candidate Analysis failed: {e}"})
            log.error(f"[Pipeline] Candidate analysis failed: {e}")
            return

        # ── 3. Research Company ────────────────────────────────────────────
        await _set_status(campaign_id, "researching_company")
        try:
            research_agent = ResearchAgent()
            company_research = research_agent.research(campaign["company_name"])
            await _set_status(campaign_id, "research_done", {"company_research": company_research})
            log.info(f"[Pipeline] Company research done for {campaign_id}")
        except Exception as e:
            await _set_status(campaign_id, "failed", {"pipeline_error": f"Company Research failed: {e}"})
            log.error(f"[Pipeline] Company research failed: {e}")
            return

        # ── 4. Generate Draft ──────────────────────────────────────────────
        await _set_status(campaign_id, "generating_draft")
        try:
            # Re-fetch to get latest profile contact info
            user_profile = await candidate_profiles_collection.find_one({"clerk_id": user_id})
            contact_data = {}
            if user_profile:
                contact_data = {
                    "name": user_profile.get("name", ""),
                    "email": user_profile.get("email", ""),
                    "phone": user_profile.get("phone", ""),
                    "github_url": user_profile.get("github", ""),
                    "linkedin_url": user_profile.get("linkedin", ""),
                    "x_url": user_profile.get("x_url", ""),
                }
            writer = OutreachWriterAgent()
            draft_text = writer.write(
                json.dumps(jd_analysis),
                json.dumps(candidate_analysis),
                contact_data,
                campaign.get("company_name", "the company"),
                company_research,
            )
            await _set_status(campaign_id, "draft_done", {
                "generated_draft": draft_text,
                "status": "draft_generated",
            })
            log.info(f"[Pipeline] Draft generated for {campaign_id}")
        except Exception as e:
            await _set_status(campaign_id, "failed", {"pipeline_error": f"Draft Generation failed: {e}"})
            log.error(f"[Pipeline] Draft generation failed: {e}")
            return

        # ── 5. Push to Gmail Drafts ────────────────────────────────────────
        await _set_status(campaign_id, "pushing_to_gmail")
        try:
            clerk = Clerk(bearer_auth=os.environ["CLERK_SECRET_KEY"])
            tokens = clerk.users.get_o_auth_access_token(user_id=user_id, provider="oauth_google")

            if not tokens or len(tokens) == 0:
                raise ValueError("Gmail not connected — skipping auto-push.")

            token_data = tokens[0]
            access_token = token_data.token if hasattr(token_data, "token") else token_data.get("token")
            if not access_token:
                raise ValueError("Invalid Gmail token.")

            # Parse subject from draft body
            contact_email = campaign.get("contact_email", "")
            lines = draft_text.split("\n")
            subject = f"Outreach — {campaign.get('company_name', 'Opportunity')}"
            body_lines = []
            for line in lines:
                if line.lower().startswith("subject:"):
                    subject = line[8:].strip()
                else:
                    body_lines.append(line)

            gmail_draft = create_gmail_draft(
                access_token=access_token,
                to_email=contact_email,
                subject=subject,
                body_text="\n".join(body_lines).strip(),
            )
            await _set_status(campaign_id, "completed", {
                "is_saved_in_drafts": True,
                "gmail_draft_id": gmail_draft.get("id"),
                "status": "draft_created",
                "pipeline_status": "completed",
            })
            log.info(f"[Pipeline] Gmail draft created for {campaign_id}, draft_id={gmail_draft.get('id')}")

        except Exception as e:
            # Gmail push failed — not fatal, draft is still saved in DB
            await _set_status(campaign_id, "completed_no_gmail", {
                "pipeline_error": f"Gmail push failed: {e}",
                "status": "draft_generated",
            })
            log.warning(f"[Pipeline] Gmail push skipped for {campaign_id}: {e}")

        log.info(f"[Pipeline] Finished for campaign {campaign_id}")

    except Exception as e:
        log.error(f"[Pipeline] Unhandled error for {campaign_id}: {e}")
        await _set_status(campaign_id, "failed", {"pipeline_error": str(e)})
