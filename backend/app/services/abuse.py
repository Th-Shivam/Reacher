"""MongoDB-backed abuse controls for expensive outreach operations."""

from __future__ import annotations

from datetime import timedelta
from fastapi import HTTPException
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.security import env_int, idempotency_id, new_lock_token, utc_now
from app.db.mongodb import (
    outreach_controls_collection,
    outreach_idempotency_collection,
    outreach_locks_collection,
)

def _config(name: str, default: int) -> int:
    return env_int(name, default)


async def _increment_window(
    *,
    document_id: str,
    user_id: str,
    kind: str,
    window: str,
    limit: int,
    expires_at,
) -> bool:
    """Atomically consume one fixed-window quota across all API instances."""
    query = {
        "_id": document_id,
        "$or": [{"count": {"$lt": limit}}, {"count": {"$exists": False}}],
    }
    update = {
        "$inc": {"count": 1},
        "$setOnInsert": {
            "user_id": user_id,
            "kind": kind,
            "window": window,
            "expires_at": expires_at,
        },
    }

    for _ in range(2):
        try:
            result = await outreach_controls_collection.find_one_and_update(
                query,
                update,
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
            return result is not None and result.get("count", 0) <= limit
        except DuplicateKeyError:
            # Two instances can race on the first insert. The second attempt
            # observes the document and applies the normal limit predicate.
            continue
    return False


async def _decrement_window(document_id: str) -> None:
    await outreach_controls_collection.update_one(
        {"_id": document_id, "count": {"$gt": 0}},
        {"$inc": {"count": -1}},
    )


async def reserve_outreach_capacity(user_id: str) -> None:
    """Reserve hourly and daily capacity, rolling back partial reservations."""
    now = utc_now()
    hour_number = int(now.timestamp() // 3600)
    hour_window = str(hour_number)
    day_window = now.date().isoformat()
    hourly_id = f"hour:{user_id}:{hour_window}"
    daily_id = f"day:{user_id}:{day_window}"

    hourly_ok = await _increment_window(
        document_id=hourly_id,
        user_id=user_id,
        kind="hour",
        window=hour_window,
        limit=_config("OUTREACH_RATE_LIMIT_PER_HOUR", 10),
        expires_at=now + timedelta(hours=2),
    )
    if not hourly_ok:
        raise HTTPException(
            status_code=429,
            detail="Outreach request rate limit exceeded. Please try again later.",
            headers={"Retry-After": "3600"},
        )

    daily_ok = await _increment_window(
        document_id=daily_id,
        user_id=user_id,
        kind="day",
        window=day_window,
        limit=_config("OUTREACH_DAILY_QUOTA", 20),
        expires_at=now + timedelta(days=2),
    )
    if not daily_ok:
        await _decrement_window(hourly_id)
        raise HTTPException(
            status_code=429,
            detail="Daily outreach quota exceeded. Please try again tomorrow.",
            headers={"Retry-After": "86400"},
        )


async def rollback_outreach_capacity(user_id: str) -> None:
    """Undo a reservation when campaign creation cannot proceed."""
    now = utc_now()
    await _decrement_window(f"hour:{user_id}:{int(now.timestamp() // 3600)}")
    await _decrement_window(f"day:{user_id}:{now.date().isoformat()}")


async def acquire_outreach_lock(user_id: str) -> str | None:
    now = utc_now()
    ttl_seconds = _config("OUTREACH_LOCK_TTL_SECONDS", 1800)
    for slot in range(_config("OUTREACH_CONCURRENCY_LIMIT", 1)):
        token = new_lock_token()
        lock_id = f"{user_id}:{slot}"
        try:
            result = await outreach_locks_collection.find_one_and_update(
                {
                    "_id": lock_id,
                    "$or": [
                        {"expires_at": {"$lte": now}},
                        {"expires_at": {"$exists": False}},
                    ],
                },
                {
                    "$set": {
                        "user_id": user_id,
                        "slot": slot,
                        "token": token,
                        "acquired_at": now,
                        "expires_at": now + timedelta(seconds=ttl_seconds),
                    }
                },
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
        except DuplicateKeyError:
            continue
        if result and result.get("token") == token:
            return f"{slot}:{token}"
    return None


async def release_outreach_lock(user_id: str, token: str) -> None:
    slot, lock_token = token.split(":", 1)
    await outreach_locks_collection.delete_one(
        {"_id": f"{user_id}:{slot}", "token": lock_token}
    )


async def claim_idempotency(
    user_id: str,
    key: str,
    fingerprint: str,
) -> tuple[str, dict | None]:
    """Claim a key once, returning the existing record for retries."""
    record_id = idempotency_id(user_id, key)
    existing = await outreach_idempotency_collection.find_one({"_id": record_id})
    if existing:
        return record_id, existing

    now = utc_now()
    try:
        await outreach_idempotency_collection.insert_one(
            {
                "_id": record_id,
                "user_id": user_id,
                "fingerprint": fingerprint,
                "status": "in_progress",
                "created_at": now,
                "expires_at": now + timedelta(minutes=30),
            }
        )
        return record_id, None
    except DuplicateKeyError:
        existing = await outreach_idempotency_collection.find_one({"_id": record_id})
        return record_id, existing


async def complete_idempotency(record_id: str, result: dict, result_type: str) -> None:
    await outreach_idempotency_collection.update_one(
        {"_id": record_id},
        {
            "$set": {
                "status": "completed",
                "result_type": result_type,
                "result": result,
                "expires_at": utc_now() + timedelta(hours=24),
            }
        },
    )


async def fail_idempotency(record_id: str, *, uncertain: bool = False) -> None:
    await outreach_idempotency_collection.update_one(
        {"_id": record_id},
        {
            "$set": {
                "status": "uncertain" if uncertain else "failed",
                "expires_at": utc_now() + timedelta(hours=24 if uncertain else 1),
            }
        },
    )


async def delete_idempotency(record_id: str) -> None:
    await outreach_idempotency_collection.delete_one({"_id": record_id})


def idempotency_conflict() -> HTTPException:
    return HTTPException(
        status_code=409,
        detail="A request with this idempotency key is already being processed.",
    )
