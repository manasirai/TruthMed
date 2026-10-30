from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


VerdictType = Literal[
    "supported",
    "mostly_supported",
    "misleading",
    "mostly_false",
    "false",
    "insufficient_evidence",
]

ClaimType = Literal[
    "medical",
    "nutritional",
    "supplement",
    "diagnostic",
    "treatment",
    "prevention",
    "wellness",
    "other",
]


class FactCheckRequest(BaseModel):
    claim: str = Field(..., min_length=10, max_length=2000)
    language: str = Field(default="en", max_length=10)
    context_url: str | None = Field(default=None, max_length=500)

    @field_validator("claim")
    @classmethod
    def normalize_claim(cls, v: str) -> str:
        return " ".join(v.split())


class EvidenceSourceOut(BaseModel):
    title: str
    publisher: str
    url: str | None
    publication_date: str | None
    relevance_note: str
    source_tier: str

    model_config = {"from_attributes": True}


class FactCheckResultOut(BaseModel):
    id: str
    request_id: str
    verdict: VerdictType
    verdict_label: str
    claim_text: str
    claim_type: str
    short_answer: str
    what_evidence_says: str
    why_accurate_or_not: str
    supporting_evidence: str
    contradicting_evidence: str
    missing_context: str
    what_to_do_next: str
    when_to_seek_care: str
    sources: list[EvidenceSourceOut]
    retrieval_status: str
    analyzed_at: datetime

    model_config = {"from_attributes": True}


class FactCheckListItem(BaseModel):
    id: str
    request_id: str
    claim_text: str
    verdict: str
    verdict_label: str
    claim_type: str
    analyzed_at: datetime

    model_config = {"from_attributes": True}


class FactCheckHistoryResponse(BaseModel):
    items: list[FactCheckListItem]
    total: int
    page: int
    page_size: int


class FeedbackRequest(BaseModel):
    result_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class FeedbackResponse(BaseModel):
    id: str
    message: str
