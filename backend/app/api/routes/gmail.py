import os
import asyncio
import logging
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.api.dependencies import get_current_user
# pyrefly: ignore [missing-import]
from clerk_backend_api import Clerk
from app.services.gmail import create_gmail_draft, get_gmail_profile
from app.services.abuse import (
    claim_idempotency,
    complete_idempotency,
    delete_idempotency,
    fail_idempotency,
    idempotency_conflict,
)
from app.core.security import env_int, payload_fingerprint
from app.core.safe_logging import log_exception
from app.db.mongodb import outreach_collection
# pyrefly: ignore [missing-import]
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter()
log = logging.getLogger(__name__)

@router.get("/status")
async def get_gmail_status(user_id: str = Depends(get_current_user)):
    """
    Checks if the user has a valid Google OAuth access token.
    Does NOT return the token to the frontend.
    """
    gmail_request_started = False
    try:
        clerk = Clerk(bearer_auth=os.environ["CLERK_SECRET_KEY"])
        # clerk_backend_api gets a list of tokens for the provider
        tokens = await asyncio.wait_for(
            asyncio.to_thread(
                clerk.users.get_o_auth_access_token,
                user_id=user_id,
                provider="oauth_google",
            ),
            timeout=env_int("EXTERNAL_API_TIMEOUT_SECONDS", 30),
        )
        
        # tokens is typically a list of dicts/objects.
        if tokens and len(tokens) > 0:
            # We assume the first token is the active one
            token_data = tokens[0]
            # Depending on clerk_backend_api version, token might be an object or dict
            # Usually token_data.token or token_data["token"]
            access_token = token_data.token if hasattr(token_data, "token") else token_data.get("token")

            if not access_token:
                return {"connected": False}

            # Verify the token against Gmail API
            try:
                profile = await asyncio.wait_for(
                    asyncio.to_thread(get_gmail_profile, access_token),
                    timeout=env_int("EXTERNAL_API_TIMEOUT_SECONDS", 30),
                )
                
                return {
                    "connected": True,
                    "provider": "google",
                    "gmail_accessible": True,
                    "email_address": profile.get("emailAddress")
                }
            except Exception:
                log_exception(log, "Gmail access verification failed for an authenticated user")
                return {
                    "connected": True,
                    "provider": "google",
                    "gmail_accessible": False,
                    "error": "Token lacks Gmail access or is invalid"
                }
        else:
            return {
                "connected": False
            }
    except Exception:
        log_exception(log, "Gmail connection status check failed")
        return {
            "connected": False,
            "error": "Gmail connection status is temporarily unavailable."
        }

class DraftRequest(BaseModel):
    recipient_email: EmailStr
    subject: str = Field(..., min_length=1, max_length=300)
    body_text: str = Field(..., min_length=1, max_length=10_000)
    outreach_id: Optional[str] = Field(default=None, min_length=24, max_length=24)

@router.post("/draft")
async def create_draft(
    request: DraftRequest,
    idempotency_key: str = Header(
        ...,
        alias="Idempotency-Key",
        min_length=8,
        max_length=200,
    ),
    user_id: str = Depends(get_current_user),
):
    """
    Creates a new draft in the user's Gmail.
    If outreach_id is provided, marks is_saved_in_drafts=True on the campaign.
    """
    fingerprint = payload_fingerprint(request.model_dump(mode="json"))
    gmail_key = request.outreach_id or idempotency_key
    record_id, existing = await claim_idempotency(
        user_id,
        f"gmail:{gmail_key}",
        fingerprint,
    )
    if existing:
        if existing.get("fingerprint") != fingerprint:
            raise HTTPException(
                status_code=409,
                detail="A Gmail draft already exists for this outreach request.",
            )
        if existing.get("status") == "completed" and existing.get("result_type") == "gmail":
            return existing["result"]
        raise idempotency_conflict()

    try:
        campaign = None
        if request.outreach_id:
            try:
                campaign = await outreach_collection.find_one(
                    {"_id": ObjectId(request.outreach_id), "clerk_id": user_id}
                )
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid outreach ID.")
            if not campaign:
                raise HTTPException(status_code=404, detail="Outreach campaign not found.")
            if campaign.get("gmail_draft_id"):
                result = {
                    "status": "success",
                    "message": "Draft already exists",
                    "draft_id": campaign["gmail_draft_id"],
                    "metadata": {
                        "recipient": request.recipient_email,
                        "subject": request.subject,
                    },
                }
                await complete_idempotency(record_id, result, "gmail")
                return result

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
            raise HTTPException(status_code=401, detail="Google account not connected.")
            
        token_data = tokens[0]
        access_token = token_data.token if hasattr(token_data, "token") else token_data.get("token")
        
        if not access_token:
            raise HTTPException(status_code=401, detail="Invalid Google token.")

        # Create draft using existing service
        gmail_request_started = True
        draft = await asyncio.wait_for(
            asyncio.to_thread(
                create_gmail_draft,
                access_token=access_token,
                to_email=request.recipient_email,
                subject=request.subject,
                body_text=request.body_text,
            ),
            timeout=env_int("EXTERNAL_API_TIMEOUT_SECONDS", 30),
        )

        draft_id = draft.get("id")

        result = {
            "status": "success",
            "message": "Draft created successfully",
            "draft_id": draft_id,
            "metadata": {
                "recipient": request.recipient_email,
                "subject": request.subject,
            },
        }
        await complete_idempotency(record_id, result, "gmail")

        if request.outreach_id:
            try:
                await outreach_collection.update_one(
                    {"_id": ObjectId(request.outreach_id), "clerk_id": user_id},
                    {"$set": {
                        "is_saved_in_drafts": True,
                        "gmail_draft_id": draft_id,
                        "status": "draft_created",
                        "updated_at": datetime.now(timezone.utc)
                    }}
                )
            except Exception:
                # The Gmail side effect already happened and the idempotency
                # result is durable, so do not retry and create a duplicate.
                log_exception(log, "Failed to update outreach after Gmail draft creation")

        return result
    except HTTPException:
        await delete_idempotency(record_id)
        raise
    except Exception:
        if gmail_request_started:
            await fail_idempotency(record_id, uncertain=True)
        else:
            await delete_idempotency(record_id)
        log_exception(log, "Gmail draft creation failed")
        raise HTTPException(
            status_code=502,
            detail="Gmail draft creation is temporarily unavailable.",
        )
