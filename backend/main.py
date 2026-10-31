"""
TruthMed Backend — FastAPI application entry point.

Start with:
    cd backend
    uvicorn main:app --reload --port 8001
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.fact_check import router as fact_check_router
from app.api.organs import router as organs_router
from app.core.config import settings
from app.db.database import create_tables
from app.db.seed_organs import seed_organs
from app.db.database import SessionLocal

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("TruthMed backend starting up…")
    create_tables()
    db = SessionLocal()
    try:
        seed_organs(db)
        logger.info("Database ready.")
    finally:
        db.close()
    yield
    logger.info("TruthMed backend shutting down.")


app = FastAPI(
    title="TruthMed API",
    version="1.0.0",
    description="AI-powered health fact-checking and anatomy explorer backend.",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(fact_check_router)
app.include_router(organs_router)


@app.get("/api/v1/health", tags=["health"])
def health():
    return {
        "status": "ok",
        "analysis_configured": settings.has_anthropic_key,
        "retrieval_configured": settings.has_brave_key,
    }
