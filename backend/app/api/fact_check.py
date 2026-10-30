from __future__ import annotations

import logging
import unicodedata
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.fact_check import (
    EvidenceSource,
    FactCheckRequest,
    FactCheckResult,
    UserFeedback,
)
from app.schemas.fact_check import (
    FactCheckHistoryResponse,
    FactCheckListItem,
    FactCheckRequest as FactCheckRequestSchema,
    FactCheckResultOut,
    FeedbackRequest,
    FeedbackResponse,
)
from app.services.fact_checker import run_fact_check

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["fact-check"])


def _normalize_claim(claim: str) -> str:
    """Lowercase, drop punctuation, and collapse whitespace so trivially different wordings match."""
    no_punct = "".join(" " if unicodedata.category(ch).startswith("P") else ch for ch in claim.lower())
    return " ".join(no_punct.split())


def _to_out(result: FactCheckResult, claim_text: str) -> FactCheckResultOut:
    return FactCheckResultOut(
        id=result.id,
        request_id=result.request_id,
        verdict=result.verdict,
        verdict_label=result.verdict_label,
        claim_text=claim_text,
        claim_type=result.claim_type,
        short_answer=result.short_answer,
        what_evidence_says=result.what_evidence_says,
        why_accurate_or_not=result.why_accurate_or_not,
        supporting_evidence=result.supporting_evidence,
        contradicting_evidence=result.contradicting_evidence,
        missing_context=result.missing_context,
        what_to_do_next=result.what_to_do_next,
        when_to_seek_care=result.when_to_seek_care,
        sources=[
            {
                "title": s.title,
                "publisher": s.publisher,
                "url": s.url,
                "publication_date": s.publication_date,
                "relevance_note": s.relevance_note,
                "source_tier": s.source_tier,
            }
            for s in sorted(result.sources, key=lambda x: x.position)
        ],
        retrieval_status=result.retrieval_status,
        analyzed_at=result.created_at,
    )


@router.post("/fact-check", response_model=FactCheckResultOut)
async def create_fact_check(body: FactCheckRequestSchema, db: Session = Depends(get_db)) -> FactCheckResultOut:
    normalized = _normalize_claim(body.claim)

    # Reuse the latest successful analysis of the same claim instead of calling Claude again
    cached = (
        db.query(FactCheckRequest)
        .filter_by(claim_normalized=normalized, status="completed")
        .order_by(FactCheckRequest.created_at.desc())
        .first()
    )
    if cached and cached.result:
        logger.info("Reusing fact-check result %s for repeated claim", cached.result.id)
        return _to_out(cached.result, cached.claim_text)

    # Persist request
    req = FactCheckRequest(
        claim_text=body.claim,
        claim_normalized=normalized,
        language=body.language,
        context_url=body.context_url,
        status="pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Run the pipeline
    pipeline_result = await run_fact_check(body.claim)

    now = datetime.now(timezone.utc)
    result = FactCheckResult(
        request_id=req.id,
        verdict=pipeline_result.verdict,
        verdict_label=pipeline_result.verdict_label,
        claim_type=pipeline_result.claim_type,
        short_answer=pipeline_result.short_answer,
        what_evidence_says=pipeline_result.what_evidence_says,
        why_accurate_or_not=pipeline_result.why_accurate_or_not,
        supporting_evidence=pipeline_result.supporting_evidence,
        contradicting_evidence=pipeline_result.contradicting_evidence,
        missing_context=pipeline_result.missing_context,
        what_to_do_next=pipeline_result.what_to_do_next,
        when_to_seek_care=pipeline_result.when_to_seek_care,
        retrieval_status=pipeline_result.retrieval_status,
    )
    db.add(result)
    db.flush()

    for i, src in enumerate(pipeline_result.sources):
        db.add(EvidenceSource(
            result_id=result.id,
            title=src["title"],
            publisher=src["publisher"],
            url=src.get("url"),
            publication_date=src.get("publication_date"),
            relevance_note=src["relevance_note"],
            source_tier=src.get("source_tier", "secondary"),
            position=i,
        ))

    # Failed analyses (missing key, API error, parse error) are marked "error" so they are never reused
    req.status = "error" if pipeline_result.error else "completed"
    req.completed_at = now
    db.commit()
    db.refresh(result)

    return _to_out(result, req.claim_text)


@router.get("/fact-check/history", response_model=FactCheckHistoryResponse)
def get_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> FactCheckHistoryResponse:
    offset = (page - 1) * page_size
    total = db.query(FactCheckResult).count()
    results = (
        db.query(FactCheckResult)
        .order_by(FactCheckResult.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    items = []
    for r in results:
        req = db.query(FactCheckRequest).filter_by(id=r.request_id).first()
        items.append(
            FactCheckListItem(
                id=r.id,
                request_id=r.request_id,
                claim_text=req.claim_text if req else "Unknown",
                verdict=r.verdict,
                verdict_label=r.verdict_label,
                claim_type=r.claim_type,
                analyzed_at=r.created_at,
            )
        )

    return FactCheckHistoryResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/fact-check/{result_id}", response_model=FactCheckResultOut)
def get_fact_check(result_id: str, db: Session = Depends(get_db)) -> FactCheckResultOut:
    result = db.query(FactCheckResult).filter_by(id=result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Fact-check result not found")

    req = db.query(FactCheckRequest).filter_by(id=result.request_id).first()
    return _to_out(result, req.claim_text if req else "Unknown")


@router.post("/feedback", response_model=FeedbackResponse)
def submit_feedback(body: FeedbackRequest, db: Session = Depends(get_db)) -> FeedbackResponse:
    result = db.query(FactCheckResult).filter_by(id=body.result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    feedback = UserFeedback(
        result_id=body.result_id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return FeedbackResponse(id=feedback.id, message="Thank you for your feedback.")
