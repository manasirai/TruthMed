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


class RedFlagOut(BaseModel):
    code: str
    reason: str


class ModelCheckOut(BaseModel):
    """Second opinion from the trained misinformation model. Not shown as the verdict."""

    model_name: str
    classification: str  # Reliable | Suspicious | Healthcare Misinformation
    misinformation_score: float  # 0-100
    classifier_probability: float  # 0-100
    language: str
    category: str
    fact_status: str
    red_flags: list[RedFlagOut]
    agrees_with_verdict: bool | None  # None when either side has no clear verdict


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
    model_check: ModelCheckOut | None = None

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


class HistoryDeleteRequest(BaseModel):
    ids: list[str] = Field(..., min_length=1, max_length=500)


class HistoryDeleteResponse(BaseModel):
    deleted: int


class VerdictLookupRequest(BaseModel):
    claims: list[str] = Field(..., min_length=1, max_length=50)


class VerdictLookupItem(BaseModel):
    claim: str
    result_id: str
    verdict: str
    verdict_label: str


class FeedbackRequest(BaseModel):
    result_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class FeedbackResponse(BaseModel):
    id: str
    message: str
