import base64
import logging
from email.message import EmailMessage
# pyrefly: ignore [missing-import]
from google.oauth2.credentials import Credentials
# pyrefly: ignore [missing-import]
from google_auth_httplib2 import AuthorizedHttp
# pyrefly: ignore [missing-import]
from googleapiclient.discovery import build
import httplib2

from app.core.security import env_int
from app.core.safe_logging import log_exception

log = logging.getLogger(__name__)


def _gmail_service(access_token: str):
    credentials = Credentials(token=access_token)
    authorized_http = AuthorizedHttp(
        credentials,
        http=httplib2.Http(timeout=env_int("EXTERNAL_API_TIMEOUT_SECONDS", 30)),
    )
    return build("gmail", "v1", http=authorized_http, cache_discovery=False)


def get_gmail_profile(access_token: str) -> dict:
    try:
        return _gmail_service(access_token).users().getProfile(userId="me").execute()
    except Exception:
        log_exception(log, "Gmail profile request failed")
        raise RuntimeError("Gmail profile request failed")

def create_gmail_draft(access_token: str, to_email: str, subject: str, body_text: str):
    """
    Creates a draft in the user's Gmail using the provided OAuth access token.
    """
    try:
        service = _gmail_service(access_token)
        
        message = EmailMessage()
        message.set_content(body_text)
        message['To'] = to_email
        message['Subject'] = subject
        
        # Encode the message in base64url format
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {'message': {'raw': encoded_message}}
        
        # Call the Gmail API to create the draft
        draft = service.users().drafts().create(userId="me", body=create_message).execute()
        return draft
    except Exception:
        log_exception(log, "Gmail draft request failed")
        raise RuntimeError("Gmail draft request failed")
