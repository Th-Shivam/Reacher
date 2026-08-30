# pyrefly: ignore [missing-import]
import wikipedia
# pyrefly: ignore [missing-import]
from ddgs import DDGS
from contextlib import contextmanager
from contextvars import ContextVar
import logging

from app.core.security import env_int
from app.core.safe_logging import log_exception

log = logging.getLogger(__name__)
_search_usage: ContextVar[dict | None] = ContextVar("search_usage", default=None)


@contextmanager
def search_budget():
    token = _search_usage.set({"count": 0, "limit": env_int("MAX_WEB_SEARCHES_PER_RESEARCH", 2)})
    try:
        yield
    finally:
        _search_usage.reset(token)


def _consume_search() -> None:
    usage = _search_usage.get()
    if usage is None:
        return
    if usage["count"] >= usage["limit"]:
        raise RuntimeError("Search budget exhausted")
    usage["count"] += 1

def search_wikipedia(query: str) -> str:
    """Searches Wikipedia and returns a short summary of the page."""
    try:
        _consume_search()
        results = wikipedia.search(query)
        if not results:
            return "No Wikipedia page found for this query."
        
        summary = wikipedia.summary(results[0], sentences=5)
        return summary
    except Exception:
        log_exception(log, "Wikipedia search failed")
        return "Wikipedia search is temporarily unavailable."

def search_web(query: str) -> str:
    """Uses DuckDuckGo to search the web and returns a summary of top results."""
    try:
        _consume_search()
        with DDGS(timeout=env_int("WEB_SEARCH_TIMEOUT_SECONDS", 15)) as ddgs:
            results = list(ddgs.text(query, max_results=3))
            
        if not results:
            return "No web results found."
            
        formatted_results = []
        for r in results:
            formatted_results.append(f"Title: {r.get('title')}\nSnippet: {r.get('body')}")
            
        return "\n\n".join(formatted_results)
    except Exception:
        log_exception(log, "Web search failed")
        return "Web search is temporarily unavailable."
