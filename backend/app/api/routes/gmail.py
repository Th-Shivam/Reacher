import os
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from googleapiclient.discovery import build
# pyrefly: ignore [missing-import]
from google.oauth2.credentials import Credentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.api.dependencies import get_current_user
# pyrefly: ignore [missing-import]
from clerk_backend_api import Clerk
from app.services.gmail import create_gmail_draft
from app.db.mongodb import outreach_collection
# pyrefly: ignore [missing-import]
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter()

@router.get("/status")
async def get_gmail_status(user_id: str = Depends(get_current_user)):
    """
    Checks if the user has a valid Google OAuth access token.
    Does NOT return the token to the frontend.
    """
    try:
        clerk = Clerk(bearer_auth=os.environ["CLERK_SECRET_KEY"])
        # clerk_backend_api gets a list of tokens for the provider
        tokens = clerk.users.get_o_auth_access_token(user_id=user_id, provider="oauth_google")
        
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
                creds = Credentials(token=access_token)
                service = build('gmail', 'v1', credentials=creds)
                
                # Make a lightweight request to verify access
                profile = service.users().getProfile(userId='me').execute()
                
                return {
                    "connected": True,
                    "provider": "google",
                    "gmail_accessible": True,
                    "email_address": profile.get("emailAddress")
                }
            except Exception as gmail_err:
                # Token exists but might not have Gmail scopes or is invalid
                print(f"Gmail API Verification Error: {gmail_err}")
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
    except Exception as e:
        # If there's an error (like user hasn't connected Google), return false safely
        return {
            "connected": False,
            "error": str(e)
        }

class DraftRequest(BaseModel):
    recipient_email: EmailStr
    subject: str
    body_text: str
    outreach_id: Optional[str] = None   # ← optional campaign reference

@router.post("/draft")
async def create_draft(request: DraftRequest, user_id: str = Depends(get_current_user)):
    """
    Creates a new draft in the user's Gmail.
    If outreach_id is provided, marks is_saved_in_drafts=True on the campaign.
    """
    try:
        clerk = Clerk(bearer_auth=os.environ["CLERK_SECRET_KEY"])
        tokens = clerk.users.get_o_auth_access_token(user_id=user_id, provider="oauth_google")
        
        if not tokens or len(tokens) == 0:
            raise HTTPException(status_code=401, detail="Google account not connected.")
            
        token_data = tokens[0]
        access_token = token_data.token if hasattr(token_data, "token") else token_data.get("token")
        
        if not access_token:
            raise HTTPException(status_code=401, detail="Invalid Google token.")

        # Create draft using existing service
        draft = create_gmail_draft(
            access_token=access_token,
            to_email=request.recipient_email,
            subject=request.subject,
            body_text=request.body_text
        )

        draft_id = draft.get("id")

        # ── Mark the outreach campaign as saved in drafts ──────────────────
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
            except Exception as db_err:
                # Don't fail the whole request if DB update fails — log and continue
                print(f"[gmail /draft] DB update error for outreach {request.outreach_id}: {db_err}")

        return {
            "status": "success",
            "message": "Draft created successfully",
            "draft_id": draft_id,
            # safe metadata
            "metadata": {
                "recipient": request.recipient_email,
                "subject": request.subject
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
