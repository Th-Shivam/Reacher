import base64
from email.message import EmailMessage
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

def create_gmail_draft(access_token: str, to_email: str, subject: str, body_text: str):
    """
    Creates a draft in the user's Gmail using the provided OAuth access token.
    """
    try:
        # We only need the access token to authenticate the API request
        creds = Credentials(token=access_token)
        service = build('gmail', 'v1', credentials=creds)
        
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
    except HttpError as error:
        raise Exception(f"An error occurred with Gmail API: {error}")
    except Exception as e:
        raise Exception(f"Failed to create draft: {e}")
