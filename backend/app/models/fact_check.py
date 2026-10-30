from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class FactCheckRequest(Base):
    __tablename__ = "fact_check_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    # Lowercased, punctuation-stripped claim used to reuse earlier results for repeated claims
    claim_normalized: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    language: Mapped[str] = mapped_column(String(10), default="en")
    context_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|completed|error

    result: Mapped["FactCheckResult | None"] = relationship(
        "FactCheckResult", back_populates="request", uselist=False, cascade="all, delete-orphan"
    )


class FactCheckResult(Base):
    __tablename__ = "fact_check_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id: Mapped[str] = mapped_column(String(36), ForeignKey("fact_check_requests.id"), nullable=False)
    verdict: Mapped[str] = mapped_column(String(60), nullable=False)
    verdict_label: Mapped[str] = mapped_column(String(100), nullable=False)
    short_answer: Mapped[str] = mapped_column(Text, nullable=False)
    what_evidence_says: Mapped[str] = mapped_column(Text, nullable=False)
    why_accurate_or_not: Mapped[str] = mapped_column(Text, nullable=False)
    supporting_evidence: Mapped[str] = mapped_column(Text, nullable=False)
    contradicting_evidence: Mapped[str] = mapped_column(Text, nullable=False)
    missing_context: Mapped[str] = mapped_column(Text, nullable=False)
    what_to_do_next: Mapped[str] = mapped_column(Text, nullable=False)
    when_to_seek_care: Mapped[str] = mapped_column(Text, nullable=False)
    claim_type: Mapped[str] = mapped_column(String(50), nullable=False)
    retrieval_status: Mapped[str] = mapped_column(String(30), default="not_attempted")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    sources: Mapped[list["EvidenceSource"]] = relationship(
        "EvidenceSource", back_populates="result", cascade="all, delete-orphan"
    )
    request: Mapped["FactCheckRequest"] = relationship("FactCheckRequest", back_populates="result")


class EvidenceSource(Base):
    __tablename__ = "evidence_sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    result_id: Mapped[str] = mapped_column(String(36), ForeignKey("fact_check_results.id"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    publisher: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    publication_date: Mapped[str | None] = mapped_column(String(30), nullable=True)
    relevance_note: Mapped[str] = mapped_column(Text, nullable=False)
    source_tier: Mapped[str] = mapped_column(String(20), default="secondary")  # primary|secondary|tertiary
    position: Mapped[int] = mapped_column(Integer, default=0)

    result: Mapped["FactCheckResult"] = relationship("FactCheckResult", back_populates="sources")


class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    result_id: Mapped[str] = mapped_column(String(36), ForeignKey("fact_check_results.id"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
