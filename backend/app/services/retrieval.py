"""
Evidence retrieval service.

When a Brave Search API key is configured, performs real web searches against
trusted medical domains.  Without the key the service returns an empty result
set and sets retrieval_status to "unavailable" so callers can explain the
limitation transparently rather than fabricating sources.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from urllib.parse import urlparse

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Allowlist of trusted medical domains.  Only results from these domains are
# returned so that prompt-injection from arbitrary web pages is minimised.
TRUSTED_DOMAINS = {
    "who.int",
    "mohfw.gov.in",
    "icmr.gov.in",
    "nhs.uk",
    "cdc.gov",
    "nih.gov",
    "nlm.nih.gov",
    "medlineplus.gov",
    "fda.gov",
    "pubmed.ncbi.nlm.nih.gov",
    "ncbi.nlm.nih.gov",
    "bmj.com",
    "thelancet.com",
    "nejm.org",
    "jamanetwork.com",
    "mayoclinic.org",
    "clevelandclinic.org",
    "hopkinsmedicine.org",
}

BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"


@dataclass
class RetrievedSource:
    title: str
    url: str
    publisher: str
    snippet: str
    source_tier: str = "secondary"


@dataclass
class RetrievalResult:
    sources: list[RetrievedSource] = field(default_factory=list)
    status: str = "not_attempted"  # not_attempted | success | partial | unavailable | error


def _domain_from_url(url: str) -> str:
    try:
        return urlparse(url).hostname or ""
    except Exception:
        return ""


def _tier_for_domain(domain: str) -> str:
    primary = {"who.int", "mohfw.gov.in", "icmr.gov.in", "nhs.uk", "cdc.gov", "nih.gov", "medlineplus.gov", "fda.gov"}
    if any(domain.endswith(d) for d in primary):
        return "primary"
    return "secondary"


async def retrieve_evidence(claim: str) -> RetrievalResult:
    if not settings.has_brave_key:
        return RetrievalResult(status="unavailable")

    query = f"health medical evidence {claim[:200]}"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": settings.brave_search_api_key,
    }
    params = {
        "q": query,
        "count": 10,
        "search_lang": "en",
        "safesearch": "strict",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(BRAVE_SEARCH_URL, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        logger.warning("Brave search failed: %s", exc)
        return RetrievalResult(status="error")

    sources: list[RetrievedSource] = []
    web_results = data.get("web", {}).get("results", [])
    for item in web_results:
        url = item.get("url", "")
        domain = _domain_from_url(url)
        if not any(domain.endswith(td) for td in TRUSTED_DOMAINS):
            continue
        title = item.get("title", "").strip()
        snippet = item.get("description", "").strip()
        if not title or not snippet:
            continue
        sources.append(
            RetrievedSource(
                title=title,
                url=url,
                publisher=domain,
                snippet=snippet,
                source_tier=_tier_for_domain(domain),
            )
        )

    return RetrievalResult(
        sources=sources[:5],
        status="success" if sources else "partial",
    )
