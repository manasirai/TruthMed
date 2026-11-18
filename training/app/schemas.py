"""Request and response models for the API."""
from typing import Literal, Optional

from pydantic import BaseModel, Field

from .settings import settings


class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=settings.max_text_length,
                      description="The post or claim, in English, Hindi or Hinglish.",
                      examples=["WHO has confirmed that drinking hot water cures all COVID-19 variants."])
    source: Optional[str] = Field(None, max_length=500,
                                  description="Where the post came from: a link, a website or a name such as WhatsApp or MoHFW.",
                                  examples=["WhatsApp"])
    explain: bool = Field(True, description="Include word-level contributions (top_features).")


class BatchPredictRequest(BaseModel):
    items: list[PredictRequest] = Field(..., min_length=1, max_length=settings.max_batch_size)


class FactVerification(BaseModel):
    status: str
    status_code: Literal["contradicts_fact", "matches_myth", "supports_fact", "no_match"]
    matched_statement: Optional[str]
    matched_source: Optional[str]
    similarity: Optional[float]


class SourceCredibility(BaseModel):
    level: Literal["High", "Medium", "Low", "Unknown"]
    reason: str


class ClassifierOutput(BaseModel):
    name: str
    misinformation_probability: float


class RedFlag(BaseModel):
    code: str
    reason: str


class FeatureContribution(BaseModel):
    feature: str
    contribution: float


class PredictResponse(BaseModel):
    prediction_id: Optional[str] = Field(None, description="Pass to POST /api/v1/feedback to correct this result.")
    input: str
    cleaned_input: str
    language: str
    category: Literal["Healthcare", "Non-healthcare"]
    health_terms: list[str]
    classification: Literal["Reliable", "Suspicious", "Healthcare Misinformation"]
    misinformation_score: float = Field(..., description="0-100")
    confidence: float = Field(..., description="0-100")
    fact_verification: FactVerification
    source_credibility: SourceCredibility
    classifier: ClassifierOutput
    red_flags: list[RedFlag]
    top_features: list[FeatureContribution]
    reasons: list[str]
    explanation: str
    disclaimer: str


class BatchPredictResponse(BaseModel):
    count: int
    results: list[PredictResponse]


class KBMatch(BaseModel):
    statement: str
    type: str
    source: str
    id: str
    similarity: float


class KBSearchResponse(BaseModel):
    query: str
    matches: list[KBMatch]


class SourceCheckResponse(BaseModel):
    source: Optional[str]
    level: str
    reason: str


class FeedbackRequest(BaseModel):
    """The correct label for a post. Give either the prediction_id from /predict, or the text itself."""
    label: Literal["misinformation", "trustworthy"]
    prediction_id: Optional[str] = Field(None, examples=["3f2c9a..."])
    text: Optional[str] = Field(None, max_length=settings.max_text_length)
    source: Optional[str] = Field(None, max_length=500)
    language: Optional[Literal["English", "Hindi", "Hinglish"]] = None
    comment: Optional[str] = Field(None, max_length=2000, description="Why, or a link to the evidence.")


class FeedbackResponse(BaseModel):
    feedback_id: str
    prediction_id: Optional[str]
    text: str
    label: str
    message: str


class HealthResponse(BaseModel):
    status: Literal["ok", "loading", "error"]
    model_loaded: bool
    detail: Optional[str] = None
