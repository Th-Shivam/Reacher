"""Shared security and abuse-control helpers for the API."""

from __future__ import annotations

import hashlib
import json
import os
import secrets
from datetime import datetime, timezone


def env_int(name: str, default: int, *, minimum: int = 1) -> int:
    """Read a positive integer configuration value with a safe fallback."""
    raw_value = os.environ.get(name)
    try:
        value = int(raw_value) if raw_value is not None else default
    except (TypeError, ValueError):
        value = default
    return max(value, minimum)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def idempotency_id(user_id: str, key: str) -> str:
    """Avoid storing raw user-provided idempotency keys in MongoDB identifiers."""
    value = f"{user_id}:{key}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()


def payload_fingerprint(payload: dict) -> str:
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def new_lock_token() -> str:
    return secrets.token_urlsafe(24)
