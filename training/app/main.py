"""
FastAPI backend for the Healthcare Misinformation Detection System.

Run with:  uvicorn app.main:app --host 0.0.0.0 --port 8000
Docs:      http://localhost:8000/docs
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import misinfo_rules as rules
from .model_service import ModelService
from .schemas import (
    BatchPredictRequest, BatchPredictResponse, FeedbackRequest, FeedbackResponse, HealthResponse,
    KBSearchResponse, PredictRequest, PredictResponse, SourceCheckResponse,
)
from .settings import settings
from .storage import Store

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logging.getLogger("httpx").setLevel(logging.WARNING)        # Hugging Face download chatter
log = logging.getLogger("misinfo.api")

service = ModelService(settings.artifacts_dir, settings.device, settings.kb_top_k, settings.explain_top_n)
store = Store(settings.data_dir, enabled=settings.store_inputs)
load_error: str | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global load_error
    try:
        service.load()
    except Exception as e:               # keep the server up so /health can report the problem
        load_error = f"{type(e).__name__}: {e}"
        log.exception("Failed to load artifacts")
    yield


app = FastAPI(
    title="Healthcare Misinformation Detection API",
    description=("Classifies English, Hindi and Hinglish health posts as Reliable / Suspicious / "
                 "Healthcare Misinformation, with fact verification against a knowledge base, source "
                 "credibility and an explanation. " + rules.DISCLAIMER),
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    # Without this, an unexpected crash returns plain text; keep every response JSON.
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": f"Internal server error: {type(exc).__name__}"})


def require_model():
    if not service.loaded:
        raise HTTPException(503, load_error or "Models are still loading, try again shortly.")


# Endpoints are plain `def` so FastAPI runs the CPU-heavy model work in its thread pool
# instead of blocking the event loop.

@app.get("/health", response_model=HealthResponse, tags=["system"])
def health():
    if service.loaded:
        return HealthResponse(status="ok", model_loaded=True)
    return HealthResponse(status="error" if load_error else "loading", model_loaded=False, detail=load_error)


@app.get("/api/v1/model-info", tags=["system"])
def model_info():
    require_model()
    return service.info()


@app.post("/api/v1/predict", response_model=PredictResponse, tags=["prediction"])
def predict(req: PredictRequest):
    """Full pipeline for one post (same as `run_healthcare_misinformation_poc` in the notebook)."""
    require_model()
    try:
        result = service.analyze(req.text, source=req.source, explain=req.explain)
    except ValueError as e:
        raise HTTPException(422, str(e))
    result["prediction_id"] = store.save_prediction(req.source, result, service.primary_name)
    return result


@app.post("/api/v1/predict/batch", response_model=BatchPredictResponse, tags=["prediction"])
def predict_batch(req: BatchPredictRequest):
    require_model()
    explain = any(item.explain for item in req.items)
    try:
        results = service.analyze_many([(i.text, i.source) for i in req.items], explain=explain)
    except ValueError as e:
        raise HTTPException(422, str(e))
    for item, r in zip(req.items, results):
        if not item.explain:
            r["top_features"] = []
        r["prediction_id"] = store.save_prediction(item.source, r, service.primary_name)
    return BatchPredictResponse(count=len(results), results=results)


@app.get("/api/v1/kb/search", response_model=KBSearchResponse, tags=["knowledge base"])
def kb_search(q: str = Query(..., min_length=1, max_length=settings.max_text_length),
              top_k: int = Query(5, ge=1, le=50)):
    """Closest knowledge-base statements to a query (semantic search)."""
    require_model()
    clean = rules.preprocess_text(q)
    if not clean:
        raise HTTPException(422, "The query is empty after cleaning.")
    return KBSearchResponse(query=clean, matches=service.kb_search(clean, top_k=top_k))


@app.get("/api/v1/source-credibility", response_model=SourceCheckResponse, tags=["rules"])
def source_credibility(source: str = Query(..., max_length=500)):
    """Rate a source (link, domain or name) without running the models."""
    level, reason = rules.source_credibility(source)
    return SourceCheckResponse(source=source, level=level, reason=reason)


@app.post("/api/v1/feedback", response_model=FeedbackResponse, tags=["training data"])
def feedback(req: FeedbackRequest):
    """Record the correct label for a post. Labelled posts are exported for retraining
    with `python scripts/export_training_data.py`."""
    text, source, language = req.text, req.source, req.language
    if req.prediction_id:
        saved = store.find_prediction(req.prediction_id)
        if saved is None:
            raise HTTPException(404, f"No saved prediction with id {req.prediction_id}.")
        text = text or saved["text"]
        source = source or saved["source"]
        language = language or saved["language"]
    if not text or not rules.preprocess_text(text):
        raise HTTPException(422, "Give a prediction_id or a non-empty text.")
    record = store.save_feedback(label=req.label, prediction_id=req.prediction_id, text=text,
                                 source=source, language=language, comment=req.comment)
    return FeedbackResponse(feedback_id=record["feedback_id"], prediction_id=req.prediction_id, text=text,
                            label=req.label, message="Saved. It will be included in the next training export.")


@app.get("/api/v1/training-data/stats", tags=["training data"])
def training_data_stats():
    """How many posts and labelled corrections have been collected so far."""
    return store.stats()


@app.get("/", include_in_schema=False)
def root():
    return {"name": app.title, "docs": "/docs", "health": "/health", "predict": "POST /api/v1/predict"}
