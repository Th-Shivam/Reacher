"""Logging helpers that preserve tracebacks without exposing exception data."""

from __future__ import annotations

import logging
import sys


def log_exception(logger: logging.Logger, message: str, *args) -> None:
    """Log traceback frames and exception type, but redact its message."""
    error = sys.exception()
    if error is None:
        logger.error(message, *args)
        return

    redacted = RuntimeError(f"{type(error).__name__}: exception details redacted")
    logger.error(
        message,
        *args,
        exc_info=(type(redacted), redacted, error.__traceback__),
    )
