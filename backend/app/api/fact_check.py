import asyncio
import json
import logging
import re
import unicodedata
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.database import get_db
from app.models.fact_check import (
    EvidenceSource,
    FactCheckRequest,
    FactCheckResult,
    ModelPrediction,
    UserFeedback,
)
from app.schemas.fact_check import (
    FactCheckHistoryResponse,
    FactCheckListItem,
    FactCheckRequest as FactCheckRequestSchema,
    FactCheckResultOut,
    FeedbackRequest,
    FeedbackResponse,
    HistoryDeleteRequest,
    HistoryDeleteResponse,
    ModelCheckOut,
    VerdictLookupItem,
    VerdictLookupRequest,
)
from app.services import ml_model
from app.services.fact_checker import run_fact_check
from app.services.labels import agreement

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["fact-check"])


def _normalize_claim(claim: str) -> str:
    """Lowercase, drop punctuation, and collapse whitespace so trivially different wordings match."""
    no_punct = "".join(" " if unicodedata.category(ch).startswith("P") else ch for ch in claim.lower())
    return " ".join(no_punct.split())


def get_client_id(x_client_id: str = Header(default="")) -> str:
    """Anonymous per-browser ID sent by the frontend; scopes history so visitors can't see or delete each other's."""
    try:
        return str(uuid.UUID(x_client_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Missing or invalid X-Client-Id header")


def _strip_dashes(text: str) -> str:
    # Replace em dashes with a comma rather than a bare space, so the sentence keeps its punctuation
    return re.sub(r"\s*—\s*", ", ", text).strip()


def _model_check_out(result: FactCheckResult) -> ModelCheckOut | None:
    mp = result.model_prediction
    if mp is None:
        return None
    try:
        flags = json.loads(mp.red_flags_json or "[]")
    except json.JSONDecodeError:
        flags = []
    return ModelCheckOut(
        model_name=mp.model_name,
        classification=mp.classification,
        misinformation_score=mp.misinformation_score,
        classifier_probability=mp.classifier_probability,
        language=mp.language,
        category=mp.category,
        fact_status=mp.fact_status,
        red_flags=flags,
        agrees_with_verdict=agreement(result.verdict, mp.classification),
    )


def _clone_model_prediction(mp: ModelPrediction | None) -> ModelPrediction | None:
    if mp is None:
        return None
    return ModelPrediction(
        service_prediction_id=mp.service_prediction_id,
        model_name=mp.model_name,
        classification=mp.classification,
        misinformation_score=mp.misinformation_score,
        classifier_probability=mp.classifier_probability,
        language=mp.language,
        category=mp.category,
        fact_status=mp.fact_status,
        red_flags_json=mp.red_flags_json,
    )


def _to_out(result: FactCheckResult, claim_text: str) -> FactCheckResultOut:
    return FactCheckResultOut(
        id=result.id,
        request_id=result.request_id,
        verdict=result.verdict,
        verdict_label=_strip_dashes(result.verdict_label),
        claim_text=claim_text,
        claim_type=result.claim_type,
        short_answer=_strip_dashes(result.short_answer),
        what_evidence_says=_strip_dashes(result.what_evidence_says),
        why_accurate_or_not=_strip_dashes(result.why_accurate_or_not),
        supporting_evidence=_strip_dashes(result.supporting_evidence),
        contradicting_evidence=_strip_dashes(result.contradicting_evidence),
        missing_context=_strip_dashes(result.missing_context),
        what_to_do_next=_strip_dashes(result.what_to_do_next),
        when_to_seek_care=_strip_dashes(result.when_to_seek_care),
        sources=[
            {
                "title": _strip_dashes(s.title),
                "publisher": _strip_dashes(s.publisher),
                "url": s.url,
                "publication_date": s.publication_date,
                "relevance_note": _strip_dashes(s.relevance_note),
                "source_tier": s.source_tier,
            }
            for s in sorted(result.sources, key=lambda x: x.position)
        ],
        retrieval_status=result.retrieval_status,
        analyzed_at=result.created_at,
        model_check=_model_check_out(result),
    )


def _copy_result_for_client(cached: FactCheckRequest, body: FactCheckRequestSchema, client_id: str) -> FactCheckRequest:
    """Clone a completed analysis into a new request owned by this client, so it shows in their history."""
    src = cached.result
    now = datetime.now(timezone.utc)
    req = FactCheckRequest(
        claim_text=body.claim,
        claim_normalized=cached.claim_normalized,
        client_id=client_id,
        language=body.language,
        context_url=body.context_url,
        status="completed",
        completed_at=now,
    )
    req.result = FactCheckResult(
        verdict=src.verdict,
        verdict_label=src.verdict_label,
        claim_type=src.claim_type,
        short_answer=src.short_answer,
        what_evidence_says=src.what_evidence_says,
        why_accurate_or_not=src.why_accurate_or_not,
        supporting_evidence=src.supporting_evidence,
        contradicting_evidence=src.contradicting_evidence,
        missing_context=src.missing_context,
        what_to_do_next=src.what_to_do_next,
        when_to_seek_care=src.when_to_seek_care,
        retrieval_status=src.retrieval_status,
        sources=[
            EvidenceSource(
                title=s.title,
                publisher=s.publisher,
                url=s.url,
                publication_date=s.publication_date,
                relevance_note=s.relevance_note,
                source_tier=s.source_tier,
                position=s.position,
            )
            for s in src.sources
        ],
        model_prediction=_clone_model_prediction(src.model_prediction),
    )
    return req


@router.post("/fact-check", response_model=FactCheckResultOut)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def create_fact_check(
    request: Request,
    body: FactCheckRequestSchema,
    client_id: str = Depends(get_client_id),
    db: Session = Depends(get_db),
) -> FactCheckResultOut:
    normalized = _normalize_claim(body.claim)

    cached = (
        db.query(FactCheckRequest)
        .filter_by(claim_normalized=normalized, status="completed")
        .order_by(FactCheckRequest.created_at.desc())
        .first()
    )
    if cached and cached.result:
        logger.info("Reusing fact-check result %s for repeated claim", cached.result.id)
        if cached.client_id == client_id:
            return _to_out(cached.result, cached.claim_text)
        copy = _copy_result_for_client(cached, body, client_id)
        db.add(copy)
        db.commit()
        db.refresh(copy)
        return _to_out(copy.result, copy.claim_text)

    # Persist request
    req = FactCheckRequest(
        claim_text=body.claim,
        claim_normalized=normalized,
        client_id=client_id,
        language=body.language,
        context_url=body.context_url,
        status="pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Run Claude and the trained model in parallel; the model never delays or fails the fact check
    # beyond its own timeout, and returns None when it is unavailable.
    pipeline_result, model_result = await asyncio.gather(
        run_fact_check(body.claim), ml_model.predict(body.claim)
    )

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

    if model_result is not None:
        db.add(ModelPrediction(
            result_id=result.id,
            service_prediction_id=model_result.prediction_id,
            model_name=model_result.model_name,
            classification=model_result.classification,
            misinformation_score=model_result.misinformation_score,
            classifier_probability=model_result.classifier_probability,
            language=model_result.language,
            category=model_result.category,
            fact_status=model_result.fact_status,
            red_flags_json=json.dumps(model_result.red_flags, ensure_ascii=False),
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
    client_id: str = Depends(get_client_id),
    db: Session = Depends(get_db),
) -> FactCheckHistoryResponse:
    offset = (page - 1) * page_size
    # Only this client's successful analyses; failed ones (missing key, API/parse errors) are not real verdicts
    query = (
        db.query(FactCheckResult)
        .join(FactCheckResult.request)
        .filter(FactCheckRequest.client_id == client_id, FactCheckRequest.status == "completed")
    )
    total = query.count()
    results = (
        query.options(joinedload(FactCheckResult.request))
        .order_by(FactCheckResult.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    items = []
    for r in results:
        req = r.request
        items.append(
            FactCheckListItem(
                id=r.id,
                request_id=r.request_id,
                claim_text=req.claim_text if req else "Unknown",
                verdict=r.verdict,
                verdict_label=_strip_dashes(r.verdict_label),
                claim_type=r.claim_type,
                analyzed_at=r.created_at,
            )
        )

    return FactCheckHistoryResponse(items=items, total=total, page=page, page_size=page_size)


def _delete_results(db: Session, results: list[FactCheckResult]) -> int:
    """Delete results with their feedback, sources and originating request (so the claim is re-analyzed next time)."""
    if not results:
        return 0
    result_ids = [r.id for r in results]
    db.query(UserFeedback).filter(UserFeedback.result_id.in_(result_ids)).delete(synchronize_session=False)
    for r in results:
        # Deleting the request cascades to its result and evidence sources
        db.delete(r.request if r.request else r)
    db.commit()
    return len(results)


def _client_results(db: Session, client_id: str):
    return db.query(FactCheckResult).join(FactCheckResult.request).filter(FactCheckRequest.client_id == client_id)


@router.delete("/fact-check/history", response_model=HistoryDeleteResponse)
def clear_history(client_id: str = Depends(get_client_id), db: Session = Depends(get_db)) -> HistoryDeleteResponse:
    deleted = _delete_results(db, _client_results(db, client_id).all())
    # Drop this client's requests that never produced a result as well
    db.query(FactCheckRequest).filter(FactCheckRequest.client_id == client_id).delete(synchronize_session=False)
    db.commit()
    return HistoryDeleteResponse(deleted=deleted)


@router.post("/fact-check/history/delete", response_model=HistoryDeleteResponse)
def delete_history_items(
    body: HistoryDeleteRequest,
    client_id: str = Depends(get_client_id),
    db: Session = Depends(get_db),
) -> HistoryDeleteResponse:
    results = _client_results(db, client_id).filter(FactCheckResult.id.in_(body.ids)).all()
    return HistoryDeleteResponse(deleted=_delete_results(db, results))


@router.post("/fact-check/lookup", response_model=list[VerdictLookupItem])
@limiter.limit("60/minute")
def lookup_verdicts(request: Request, body: VerdictLookupRequest, db: Session = Depends(get_db)) -> list[VerdictLookupItem]:
    """Return already-analyzed verdicts for the given claims without running any new analysis."""
    by_norm: dict[str, list[str]] = {}
    for claim in body.claims:
        by_norm.setdefault(_normalize_claim(claim[:2000]), []).append(claim)

    rows = (
        db.query(FactCheckRequest)
        .options(joinedload(FactCheckRequest.result))
        .filter(FactCheckRequest.claim_normalized.in_(by_norm), FactCheckRequest.status == "completed")
        .order_by(FactCheckRequest.created_at.desc())
        .all()
    )

    items: list[VerdictLookupItem] = []
    for req in rows:
        claims = by_norm.pop(req.claim_normalized, None)  # newest row per claim wins
        if not claims or not req.result:
            continue
        for claim in claims:
            items.append(VerdictLookupItem(
                claim=claim,
                result_id=req.result.id,
                verdict=req.result.verdict,
                verdict_label=_strip_dashes(req.result.verdict_label),
            ))
    return items


@router.get("/fact-check/{result_id}", response_model=FactCheckResultOut)
def get_fact_check(result_id: str, db: Session = Depends(get_db)) -> FactCheckResultOut:
    result = db.query(FactCheckResult).filter_by(id=result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Fact-check result not found")

    req = db.query(FactCheckRequest).filter_by(id=result.request_id).first()
    return _to_out(result, req.claim_text if req else "Unknown")


@router.post("/feedback", response_model=FeedbackResponse)
@limiter.limit("30/minute")
def submit_feedback(request: Request, body: FeedbackRequest, db: Session = Depends(get_db)) -> FeedbackResponse:
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
