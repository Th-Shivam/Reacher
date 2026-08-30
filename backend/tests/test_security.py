from __future__ import annotations

import asyncio
import logging
from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.responses import Response
from pydantic import ValidationError

from app.api.routes.gmail import DraftRequest, create_draft
from app.api.routes.outreach import create_campaign
from app.api.routes.public import view_resume
from app.core.safe_logging import log_exception
from app.main import _allowed_origins, _apply_security_headers
from app.schemas.outreach import OutreachCreate
from app.schemas.profile import CandidateProfileCreate
from app.services import abuse
from app.services.profile import _stream_upload_to_tempfile, _validate_pdf


class FakeCollection:
    def __init__(self):
        self.documents = {}

    async def find_one(self, query, projection=None):
        document = self.documents.get(query.get("_id"))
        if document is None:
            return None
        if "user_id" in query and document.get("user_id") != query["user_id"]:
            return None
        return dict(document)

    async def insert_one(self, document):
        if document["_id"] in self.documents:
            from pymongo.errors import DuplicateKeyError

            raise DuplicateKeyError("duplicate")
        self.documents[document["_id"]] = dict(document)

    async def update_one(self, query, update):
        document = self.documents.get(query.get("_id"))
        if document is None:
            return
        if "count" in query and document.get("count", 0) <= 0:
            return
        if "$inc" in update:
            for key, value in update["$inc"].items():
                document[key] = document.get(key, 0) + value
        if "$set" in update:
            document.update(update["$set"])

    async def delete_one(self, query):
        document = self.documents.get(query.get("_id"))
        if document and all(document.get(k) == v for k, v in query.items() if k != "_id"):
            self.documents.pop(query["_id"], None)

    async def find_one_and_update(self, query, update, *, upsert, return_document):
        key = query["_id"]
        document = self.documents.get(key)
        matches = document is not None
        if matches and "$or" in query:
            matches = any(
                ("count" in clause and "$lt" in clause["count"] and document.get("count", 0) < clause["count"]["$lt"])
                or ("count" in clause and clause["count"].get("$exists") is False and "count" not in document)
                or ("expires_at" in clause and "$lte" in clause["expires_at"] and document.get("expires_at") <= clause["expires_at"]["$lte"])
                or ("expires_at" in clause and clause["expires_at"].get("$exists") is False and "expires_at" not in document)
                for clause in query["$or"]
            )
        if not matches:
            if document is not None or not upsert:
                return None
            document = {"_id": key}
            self.documents[key] = document
        if "$inc" in update:
            for field, amount in update["$inc"].items():
                document[field] = document.get(field, 0) + amount
        if "$set" in update:
            document.update(update["$set"])
        if "$setOnInsert" in update and document.get("_inserted") is not True:
            document.update(update["$setOnInsert"])
            document["_inserted"] = True
        return dict(document)


@pytest.fixture
def fake_collections(monkeypatch):
    controls = FakeCollection()
    locks = FakeCollection()
    idempotency = FakeCollection()
    monkeypatch.setattr(abuse, "outreach_controls_collection", controls)
    monkeypatch.setattr(abuse, "outreach_locks_collection", locks)
    monkeypatch.setattr(abuse, "outreach_idempotency_collection", idempotency)
    return controls, locks, idempotency


def test_oversized_outreach_fields_rejected():
    with pytest.raises(ValidationError):
        OutreachCreate(company_name="x" * 201, job_description="ok", contact_email="a@b.com")
    with pytest.raises(ValidationError):
        OutreachCreate(company_name="ok", job_description="x" * 10_001, contact_email="a@b.com")


def test_profile_resume_metadata_is_not_client_writable():
    with pytest.raises(ValidationError):
        CandidateProfileCreate(
            name="Candidate",
            headline="Engineer",
            resume={"file_id": "owned-by-attacker", "content_type": "text/html"},
        )


def test_html_named_pdf_is_rejected(tmp_path):
    path = tmp_path / "resume.pdf"
    path.write_bytes(b"<html><script>alert(1)</script></html>")
    with pytest.raises(HTTPException) as error:
        _validate_pdf(str(path))
    assert error.value.status_code == 400


def test_fake_pdf_signature_is_rejected(tmp_path):
    path = tmp_path / "resume.pdf"
    path.write_bytes(b"%PDF-not-parseable")
    with pytest.raises(HTTPException):
        _validate_pdf(str(path))


def test_oversized_resume_stream_stops_at_limit(monkeypatch):
    monkeypatch.setenv("MAX_RESUME_SIZE_BYTES", "5")
    class FakeUpload:
        async def read(self, size):
            return b"%PDF-oversized"

        async def close(self):
            return None

    upload = FakeUpload()
    with pytest.raises(HTTPException) as error:
        asyncio.run(_stream_upload_to_tempfile(upload))
    assert error.value.status_code == 413


def test_rate_limit_returns_429(fake_collections, monkeypatch):
    monkeypatch.setenv("OUTREACH_RATE_LIMIT_PER_HOUR", "1")
    monkeypatch.setenv("OUTREACH_DAILY_QUOTA", "20")
    asyncio.run(abuse.reserve_outreach_capacity("user-1"))
    with pytest.raises(HTTPException) as error:
        asyncio.run(abuse.reserve_outreach_capacity("user-1"))
    assert error.value.status_code == 429


def test_daily_quota_returns_429(fake_collections, monkeypatch):
    monkeypatch.setenv("OUTREACH_RATE_LIMIT_PER_HOUR", "20")
    monkeypatch.setenv("OUTREACH_DAILY_QUOTA", "1")
    asyncio.run(abuse.reserve_outreach_capacity("user-1"))
    with pytest.raises(HTTPException) as error:
        asyncio.run(abuse.reserve_outreach_capacity("user-1"))
    assert error.value.status_code == 429


def test_concurrency_lock_has_ttl_and_rejects_second_job(fake_collections, monkeypatch):
    monkeypatch.setenv("OUTREACH_CONCURRENCY_LIMIT", "1")
    first = asyncio.run(abuse.acquire_outreach_lock("user-1"))
    second = asyncio.run(abuse.acquire_outreach_lock("user-1"))
    assert first is not None
    assert second is None
    assert fake_collections[1].documents["user-1:0"]["expires_at"]


def test_idempotency_claim_is_single_use(fake_collections):
    first_id, first = asyncio.run(abuse.claim_idempotency("user-1", "outreach:key", "fp"))
    second_id, second = asyncio.run(abuse.claim_idempotency("user-1", "outreach:key", "fp"))
    assert first is None
    assert second_id == first_id
    assert second["status"] == "in_progress"


def test_idempotency_different_payload_is_detectable(fake_collections):
    record_id, _ = asyncio.run(abuse.claim_idempotency("user-1", "outreach:key", "fp-1"))
    _, existing = asyncio.run(abuse.claim_idempotency("user-1", "outreach:key", "fp-2"))
    assert existing["_id"] == record_id
    assert existing["fingerprint"] == "fp-1"


def test_outreach_idempotency_reuses_completed_result(monkeypatch):
    campaign = {
        "_id": "507f1f77bcf86cd799439011",
        "clerk_id": "user-1",
        "company_name": "Reacher",
        "job_description": "Engineer",
        "contact_email": "contact@example.com",
        "status": "pending",
        "created_at": abuse.utc_now(),
        "updated_at": abuse.utc_now(),
    }

    async def claimed(user_id, key, fingerprint):
        return "record", {
            "fingerprint": fingerprint,
            "status": "completed",
            "result_type": "outreach",
            "result": campaign,
        }

    async def must_not_run(*args, **kwargs):
        raise AssertionError("duplicate request must not acquire capacity")

    monkeypatch.setattr("app.api.routes.outreach.claim_idempotency", claimed)
    monkeypatch.setattr("app.api.routes.outreach.acquire_outreach_lock", must_not_run)
    request = OutreachCreate(
        company_name="Reacher",
        job_description="Engineer",
        contact_email="contact@example.com",
    )
    result = asyncio.run(
        create_campaign(
            request,
            type("BackgroundTasks", (), {"add_task": lambda *args: None})(),
            "idempotency-key",
            "user-1",
        )
    )
    assert result == campaign


def test_raw_internal_error_is_not_returned(monkeypatch):
    async def claimed(user_id, key, fingerprint):
        return "record", None

    async def locked(user_id):
        return "0:lock"

    async def reserved(user_id):
        return None

    async def failed_create(user_id, outreach):
        raise RuntimeError("database password and provider details")

    async def noop(*args, **kwargs):
        return None

    monkeypatch.setattr("app.api.routes.outreach.claim_idempotency", claimed)
    monkeypatch.setattr("app.api.routes.outreach.acquire_outreach_lock", locked)
    monkeypatch.setattr("app.api.routes.outreach.reserve_outreach_capacity", reserved)
    monkeypatch.setattr("app.api.routes.outreach.outreach_service.create_outreach_campaign", failed_create)
    monkeypatch.setattr("app.api.routes.outreach.rollback_outreach_capacity", noop)
    monkeypatch.setattr("app.api.routes.outreach.release_outreach_lock", noop)
    monkeypatch.setattr("app.api.routes.outreach.delete_idempotency", noop)

    request = OutreachCreate(
        company_name="Reacher",
        job_description="Engineer",
        contact_email="contact@example.com",
    )
    with pytest.raises(HTTPException) as error:
        asyncio.run(
            create_campaign(
                request,
                type("BackgroundTasks", (), {"add_task": lambda *args: None})(),
                "idempotency-key",
                "user-1",
            )
        )
    assert error.value.status_code == 500
    assert "password" not in error.value.detail


def test_gmail_idempotency_reuses_completed_result(monkeypatch):
    result = {
        "status": "success",
        "message": "Draft created successfully",
        "draft_id": "draft-id",
        "metadata": {"recipient": "contact@example.com", "subject": "Hello"},
    }

    async def claimed(user_id, key, fingerprint):
        return "record", {
            "fingerprint": fingerprint,
            "status": "completed",
            "result_type": "gmail",
            "result": result,
        }

    monkeypatch.setattr("app.api.routes.gmail.claim_idempotency", claimed)
    response = asyncio.run(
        create_draft(
            DraftRequest(
                recipient_email="contact@example.com",
                subject="Hello",
                body_text="Body",
                outreach_id="507f1f77bcf86cd799439011",
            ),
            "idempotency-key",
            "user-1",
        )
    )
    assert response == result


def test_public_resume_rejects_unvalidated_content(monkeypatch):
    class Collection:
        async def find_one(self, query, projection):
            return {"resume": {"file_id": "file", "content_type": "text/html", "validated_pdf": False}}

    class Storage:
        def get_file_view(self, **kwargs):
            raise AssertionError("unsafe file must not be served")

    monkeypatch.setattr("app.api.routes.public.candidate_profiles_collection", Collection())
    monkeypatch.setattr("app.api.routes.public.appwrite_storage", Storage())
    monkeypatch.setenv("APPWRITE_BUCKET_ID", "bucket")
    with pytest.raises(HTTPException) as error:
        asyncio.run(view_resume("token"))
    assert error.value.status_code == 404


def test_security_headers_are_added():
    request = type("Request", (), {"headers": {}, "url": type("URL", (), {"scheme": "http"})()})()
    response = _apply_security_headers(request, Response())
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"


def test_hsts_only_applies_to_https_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    request = type("Request", (), {"headers": {"x-forwarded-proto": "https"}, "url": type("URL", (), {"scheme": "http"})()})()
    response = _apply_security_headers(request, Response())
    assert "max-age=31536000" in response.headers["strict-transport-security"]


def test_untrusted_cors_origin_is_not_allowed(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://reacherpro.vercel.app")
    assert "https://evil.vercel.app" not in _allowed_origins()


def test_exception_logging_redacts_secret_message(caplog):
    secret = "Bearer super-secret-token"
    with caplog.at_level(logging.ERROR):
        try:
            raise RuntimeError(secret)
        except RuntimeError:
            log_exception(logging.getLogger("security-test"), "operation failed")
    assert secret not in caplog.text
    assert "exception details redacted" in caplog.text


def test_scratch_debug_utility_removed():
    assert not Path(__file__).parents[1].joinpath("scratch.py").exists()
