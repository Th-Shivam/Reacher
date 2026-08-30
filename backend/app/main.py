import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from app.db.mongodb import ping_database, users_collection
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
from fastapi import Depends, FastAPI, Request
from app.api.dependencies import get_current_user
from app.api.routes.profile import router as profile_router
from app.api.routes.outreach import router as outreach_router
from app.api.routes.gmail import router as gmail_router
from app.api.routes.public import router as public_router
from app.core.security import env_int
from app.core.safe_logging import log_exception

from pymongo import ReturnDocument

load_dotenv()
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await ping_database()
    except Exception:
        log_exception(log, "Database initialization failed")
        raise
    yield


app = FastAPI(title="Reacher API", lifespan=lifespan)


def _allowed_origins() -> list[str]:
    configured = os.environ.get("CORS_ALLOWED_ORIGINS", "https://reacherpro.vercel.app")
    origins = [origin.strip().rstrip("/") for origin in configured.split(",") if origin.strip()]
    if os.environ.get("ENVIRONMENT", "production").lower() != "production":
        origins.extend(["http://localhost:5173", "http://127.0.0.1:5173"])
    return list(dict.fromkeys(origins))


def _apply_security_headers(request: Request, response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    )
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",", 1)[0].strip()
    if (
        os.environ.get("ENVIRONMENT", "production").lower() == "production"
        and (request.url.scheme == "https" or forwarded_proto == "https")
    ):
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    if request.method == "POST" and request.url.path == "/api/profile/resume":
        content_length = request.headers.get("content-length")
        max_request_size = env_int("MAX_RESUME_REQUEST_SIZE_BYTES", 6 * 1024 * 1024)
        if content_length:
            try:
                if int(content_length) > max_request_size:
                    return _apply_security_headers(
                        request,
                        JSONResponse(status_code=413, content={"detail": "Resume file is too large."}),
                    )
            except ValueError:
                return _apply_security_headers(
                    request,
                    JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header."}),
                )

    response = await call_next(request)
    return _apply_security_headers(request, response)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, error: Exception):
    log_exception(log, "Unhandled API error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong while processing the request."},
    )

app.include_router(profile_router)
app.include_router(outreach_router, prefix="/api/outreach", tags=["outreach"])
app.include_router(gmail_router, prefix="/api/gmail", tags=["gmail"])
app.include_router(public_router)


@app.get("/api/health")
async def health():
    try:
        await ping_database()

        return {
            "status": "ok",
            "service": "reacher-api",
            "database": "connected",
        }

    except Exception:
        log_exception(log, "Database health check failed")
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "service": "reacher-api",
                "database": "disconnected",
            },
        )


@app.get("/api/me")
async def get_me(user_id: str = Depends(get_current_user)):
    now = datetime.now(timezone.utc)

    user = await users_collection.find_one_and_update(
        {"clerk_id": user_id},
        {
            "$setOnInsert": {
                "clerk_id": user_id,
                "created_at": now,
            },
            "$set": {
                "updated_at": now,
            },
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )

    # Convert MongoDB ObjectId to string for JSON serialization
    user["_id"] = str(user["_id"])

    return {
        "message": "Authenticated successfully",
        "user": user,
    }
