import os
from fastapi import Request, HTTPException
from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions

def get_current_user(request: Request) -> str:
    clerk = Clerk(
        bearer_auth=os.environ["CLERK_SECRET_KEY"]
    )

    request_state = clerk.authenticate_request(
        request,
        AuthenticateRequestOptions(
            authorized_parties=["http://localhost:5173", "https://reacherpro.vercel.app"],
            accepts_token=["session_token"],
        ),
    )

    if not request_state.is_signed_in:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
        )

    return request_state.payload["sub"]
