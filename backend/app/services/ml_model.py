"""
Client for the trained misinformation model (the separate FastAPI service in training/).

The model runs next to Claude, not instead of it: its verdict is stored and returned as a second
opinion, and is used to compare against Claude and to build training data. Any failure (service
not configured, not running, still loading, timeout) returns None so a fact check never fails
because of the model.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ModelPredictionData:
    prediction_id: str | None
    model_name: str
    classification: str  # Reliable | Suspicious | Healthcare Misinformation
    misinformation_score: float  # 0-100, combined pipeline score
    classifier_probability: float  # 0-100, IndicBERT alone
    language: str
    category: str  # Healthcare | Non-healthcare
    fact_status: str  # contradicts_fact | matches_myth | supports_fact | no_match
    red_flags: list[dict] = field(default_factory=list)


async def predict(claim: str) -> ModelPredictionData | None:
    if not settings.has_ml_service:
        return None
    url = settings.ml_service_url.rstrip("/") + "/api/v1/predict"
    try:
        async with httpx.AsyncClient(timeout=settings.ml_timeout_seconds) as client:
            resp = await client.post(url, json={"text": claim, "explain": False})
            resp.raise_for_status()
            data = resp.json()
        return ModelPredictionData(
            prediction_id=data.get("prediction_id"),
            model_name=str(data["classifier"]["name"]),
            classification=str(data["classification"]),
            misinformation_score=float(data["misinformation_score"]),
            classifier_probability=float(data["classifier"]["misinformation_probability"]),
            language=str(data.get("language", "")),
            category=str(data.get("category", "")),
            fact_status=str(data["fact_verification"]["status_code"]),
            red_flags=[
                {"code": str(f.get("code", "")), "reason": str(f.get("reason", ""))}
                for f in data.get("red_flags", [])
                if isinstance(f, dict)
            ],
        )
    except httpx.HTTPStatusError as exc:
        # 503 means the model is still loading; 422 means the text was empty after cleaning
        logger.warning("Model service returned %s", exc.response.status_code)
    except Exception as exc:
        logger.warning("Model service unavailable: %s", exc)
    return None
