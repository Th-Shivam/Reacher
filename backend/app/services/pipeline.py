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
import asyncio
from datetime import datetime, timezone

from bson import ObjectId  # pyrefly: ignore [missing-import]
from clerk_backend_api import Clerk  # pyrefly: ignore [missing-import]

from app.db.mongodb import outreach_collection, candidate_profiles_collection
from app.services import profile as profile_service
from app.agents.jd_analyzer import JDAnalyzerAgent
from app.agents.candidate_analyzer import CandidateAnalyzerAgent
from app.agents.research_agent import ResearchAgent
from app.agents.outreach_writer import OutreachWriterAgent, ensure_resume_link
from app.services.gmail import create_gmail_draft
from app.services.abuse import (
    claim_idempotency,
    complete_idempotency,
    delete_idempotency,
    fail_idempotency,
    release_outreach_lock,
)
from app.core.security import env_int, payload_fingerprint
from app.core.safe_logging import log_exception

log = logging.getLogger(__name__)


class PipelineBudget:
    def __init__(self) -> None:
        self.calls = 0
        self.max_calls = env_int("MAX_LLM_CALLS_PER_PIPELINE", 4)
        self.call_timeout = env_int("PIPELINE_STEP_TIMEOUT_SECONDS", 90)

    async def call(self, function, *args):
        if self.calls >= self.max_calls:
            raise RuntimeError("Pipeline LLM call budget exhausted")
        self.calls += 1
        return await asyncio.wait_for(
            asyncio.to_thread(function, *args),
            timeout=self.call_timeout,
        )


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


async def run_full_pipeline(campaign_id: str, user_id: str, lock_token: str) -> None:
    """Run a bounded pipeline and always release its distributed lock."""
    try:
        await asyncio.wait_for(
            _run_full_pipeline(campaign_id, user_id),
            timeout=env_int("PIPELINE_MAX_EXECUTION_SECONDS", 300),
        )
    except asyncio.TimeoutError:
        log.error("Pipeline timed out for campaign %s", campaign_id)
        await _set_status(
            campaign_id,
            "failed",
            {"pipeline_error": "Pipeline execution timed out."},
        )
    except Exception:
        log_exception(log, "Unhandled pipeline error for campaign %s", campaign_id)
        await _set_status(
            campaign_id,
            "failed",
            {"pipeline_error": "Pipeline execution failed."},
        )
    finally:
        await release_outreach_lock(user_id, lock_token)


async def _run_full_pipeline(campaign_id: str, user_id: str) -> None:
    """
    Background task — runs the complete outreach pipeline for one campaign.
    Called immediately after campaign creation.
    """
    log.info(f"[Pipeline] Starting for campaign {campaign_id}")
    budget = PipelineBudget()

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
            raw = await budget.call(agent.analyze, campaign["job_description"])
            clean = raw.replace("```json", "").replace("```", "").strip()
            jd_analysis = json.loads(clean)
            await _set_status(campaign_id, "jd_done", {"jd_analysis": jd_analysis})
            log.info(f"[Pipeline] JD analysis done for {campaign_id}")
        except Exception:
            await _set_status(campaign_id, "failed", {"pipeline_error": "JD analysis failed."})
            log_exception(log, "JD analysis failed for campaign %s", campaign_id)
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
            raw2 = await budget.call(candidate_agent.analyze, json.dumps(profile_data))
            clean2 = raw2.replace("```json", "").replace("```", "").strip()
            candidate_analysis = json.loads(clean2)
            await _set_status(campaign_id, "candidate_done", {"candidate_analysis": candidate_analysis})
            log.info(f"[Pipeline] Candidate analysis done for {campaign_id}")
        except Exception:
            await _set_status(campaign_id, "failed", {"pipeline_error": "Candidate analysis failed."})
            log_exception(log, "Candidate analysis failed for campaign %s", campaign_id)
            return

        # ── 3. Research Company ────────────────────────────────────────────
        await _set_status(campaign_id, "researching_company")
        try:
            research_agent = ResearchAgent()
            company_research = await budget.call(research_agent.research, campaign["company_name"])
            await _set_status(campaign_id, "research_done", {"company_research": company_research})
            log.info(f"[Pipeline] Company research done for {campaign_id}")
        except Exception:
            await _set_status(campaign_id, "failed", {"pipeline_error": "Company research failed."})
            log_exception(log, "Company research failed for campaign %s", campaign_id)
            return

        # ── 4. Generate Draft ──────────────────────────────────────────────
        await _set_status(campaign_id, "generating_draft")
        try:
            # Re-fetch to get latest profile contact info
            user_profile = await profile_service.ensure_resume_link(user_id)
            contact_data = {}
            if user_profile:
                contact_data = {
                    "name": user_profile.get("name", ""),
                    "email": user_profile.get("email", ""),
                    "phone": user_profile.get("phone", ""),
                    "github_url": user_profile.get("github", ""),
                    "linkedin_url": user_profile.get("linkedin", ""),
                    "x_url": user_profile.get("x_url", ""),
                    "resume_url": (user_profile.get("resume") or {}).get("resume_url", ""),
                }
            writer = OutreachWriterAgent()
            generated = await budget.call(
                writer.write,
                json.dumps(jd_analysis),
                json.dumps(candidate_analysis),
                contact_data,
                campaign.get("company_name", "the company"),
                company_research,
            )
            draft_text = ensure_resume_link(generated, contact_data)
            if len(draft_text) > env_int("MAX_EMAIL_BODY_CHARACTERS", 10_000):
                raise ValueError("Generated draft exceeds the configured size limit")
            await _set_status(campaign_id, "draft_done", {
                "generated_draft": draft_text,
                "status": "draft_generated",
            })
            log.info(f"[Pipeline] Draft generated for {campaign_id}")
        except Exception:
            await _set_status(campaign_id, "failed", {"pipeline_error": "Draft generation failed."})
            log_exception(log, "Draft generation failed for campaign %s", campaign_id)
            return

        # ── 5. Push to Gmail Drafts ────────────────────────────────────────
        await _set_status(campaign_id, "pushing_to_gmail")
        gmail_record_id = None
        gmail_request_started = False
        try:
            latest_campaign = await outreach_collection.find_one({"_id": ObjectId(campaign_id)})
            if latest_campaign and latest_campaign.get("gmail_draft_id"):
                await _set_status(campaign_id, "completed", {"pipeline_status": "completed"})
                return

            clerk = Clerk(bearer_auth=os.environ["CLERK_SECRET_KEY"])
            tokens = await asyncio.wait_for(
                asyncio.to_thread(
                    clerk.users.get_o_auth_access_token,
                    user_id=user_id,
                    provider="oauth_google",
                ),
                timeout=env_int("EXTERNAL_API_TIMEOUT_SECONDS", 30),
            )

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

            if len(subject) > env_int("MAX_EMAIL_SUBJECT_CHARACTERS", 300):
                raise ValueError("Generated subject exceeds the configured size limit")

            body_text = "\n".join(body_lines).strip()
            gmail_payload = {
                "recipient_email": contact_email,
                "subject": subject,
                "body_text": body_text,
                "outreach_id": campaign_id,
            }
            gmail_record_id, existing_gmail = await claim_idempotency(
                user_id,
                f"gmail:{campaign_id}",
                payload_fingerprint(gmail_payload),
            )
            if existing_gmail:
                if existing_gmail.get("status") == "completed":
                    await _set_status(campaign_id, "completed", {
                        "is_saved_in_drafts": True,
                        "gmail_draft_id": (existing_gmail.get("result") or {}).get("draft_id"),
                        "status": "draft_created",
                        "pipeline_status": "completed",
                    })
                else:
                    await _set_status(campaign_id, "completed_no_gmail", {
                        "pipeline_error": "Gmail draft creation is already in progress or requires review.",
                        "status": "draft_generated",
                    })
                return

            gmail_request_started = True
            gmail_draft = await asyncio.wait_for(
                asyncio.to_thread(
                    create_gmail_draft,
                    access_token=access_token,
                    to_email=contact_email,
                    subject=subject,
                    body_text=body_text,
                ),
                timeout=env_int("EXTERNAL_API_TIMEOUT_SECONDS", 30),
            )
            gmail_result = {
                "status": "success",
                "message": "Draft created successfully",
                "draft_id": gmail_draft.get("id"),
                "metadata": {"recipient": contact_email, "subject": subject},
            }
            await complete_idempotency(gmail_record_id, gmail_result, "gmail")
            await _set_status(campaign_id, "completed", {
                "is_saved_in_drafts": True,
                "gmail_draft_id": gmail_draft.get("id"),
                "status": "draft_created",
                "pipeline_status": "completed",
            })
            log.info("Gmail draft created for campaign %s", campaign_id)

        except Exception:
            if gmail_record_id:
                if gmail_request_started:
                    await fail_idempotency(gmail_record_id, uncertain=True)
                else:
                    await delete_idempotency(gmail_record_id)
            # Gmail push failed — not fatal, draft is still saved in DB
            await _set_status(campaign_id, "completed_no_gmail", {
                "pipeline_error": "Gmail draft creation was unavailable.",
                "status": "draft_generated",
            })
            log_exception(log, "Gmail draft creation failed for campaign %s", campaign_id)

        log.info(f"[Pipeline] Finished for campaign {campaign_id}")

    except Exception:
        log_exception(log, "Pipeline failed for campaign %s", campaign_id)
        await _set_status(campaign_id, "failed", {"pipeline_error": "Pipeline execution failed."})
