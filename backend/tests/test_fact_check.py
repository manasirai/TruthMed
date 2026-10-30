"""Tests for fact-check endpoints — uses mocked Anthropic API."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


MOCK_PIPELINE_RESULT = {
    "verdict": "misleading",
    "verdict_label": "Misleading or Missing Context",
    "claim_type": "nutritional",
    "short_answer": "This claim is misleading. While carrots contain beta-carotene which the body converts to vitamin A, they do not improve vision beyond correcting a deficiency.",
    "what_evidence_says": "Evidence shows that vitamin A deficiency causes night blindness and that correcting deficiency restores normal vision. However, eating carrots above the threshold needed to meet vitamin A requirements does not further improve vision.",
    "why_accurate_or_not": "The claim originates partly from WWII British propaganda and from the real link between vitamin A and vision. It is misleading because it implies eating more carrots improves vision beyond baseline.",
    "supporting_evidence": "Vitamin A (retinol) is essential for producing rhodopsin in the eye's rods. WHO data confirms that vitamin A deficiency is a leading cause of preventable blindness in children.",
    "contradicting_evidence": "Well-controlled clinical studies show no evidence that supranormal vitamin A intake improves normal vision. The Cochrane Library systematic review found no benefit beyond correcting deficiency.",
    "missing_context": "The claim conflates preventing deficiency (real) with improving normal vision (not supported). People with adequate vitamin A intake see no visual benefit from extra carrots.",
    "what_to_do_next": "Eat a balanced diet including orange and yellow vegetables for general health. Do not self-treat eye problems with dietary changes without medical advice.",
    "when_to_seek_care": "See an optometrist or ophthalmologist for any vision changes, night blindness, or persistent eye discomfort.",
    "sources": [
        {
            "title": "Vitamin A deficiency and blindness",
            "publisher": "WHO",
            "url": "https://www.who.int/health-topics/vitamin-a-deficiency",
            "publication_date": "2023",
            "relevance_note": "WHO guidance on vitamin A deficiency and vision.",
            "source_tier": "primary",
        }
    ],
    "retrieval_status": "unavailable",
    "error": None,
}


@pytest.fixture
def mock_fact_check():
    with patch("app.api.fact_check.run_fact_check") as mock:
        from app.services.fact_checker import FactCheckPipelineResult
        mock.return_value = FactCheckPipelineResult(**MOCK_PIPELINE_RESULT)
        yield mock


def test_fact_check_valid_claim(client, mock_fact_check):
    resp = client.post(
        "/api/v1/fact-check",
        json={"claim": "Eating carrots improves your eyesight significantly."},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "misleading"
    assert data["verdict_label"] == "Misleading or Missing Context"
    assert data["claim_type"] == "nutritional"
    assert len(data["short_answer"]) > 10
    assert isinstance(data["sources"], list)
    assert data["retrieval_status"] == "unavailable"
    assert "id" in data
    assert "request_id" in data
    assert "analyzed_at" in data


def test_fact_check_empty_claim(client):
    resp = client.post("/api/v1/fact-check", json={"claim": ""})
    assert resp.status_code == 422


def test_fact_check_too_short_claim(client):
    resp = client.post("/api/v1/fact-check", json={"claim": "short"})
    assert resp.status_code == 422


def test_fact_check_too_long_claim(client):
    resp = client.post("/api/v1/fact-check", json={"claim": "x" * 2001})
    assert resp.status_code == 422


def test_history_empty_initially(client):
    resp = client.get("/api/v1/fact-check/history")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data


def test_history_after_fact_check(client, mock_fact_check):
    claim_text = "Drinking 8 glasses of water per day is required for good health for all people."
    client.post("/api/v1/fact-check", json={"claim": claim_text})
    resp = client.get("/api/v1/fact-check/history")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


def test_get_fact_check_by_id(client, mock_fact_check):
    create_resp = client.post(
        "/api/v1/fact-check",
        json={"claim": "Vitamin C supplements prevent the common cold entirely."},
    )
    assert create_resp.status_code == 200
    result_id = create_resp.json()["id"]

    get_resp = client.get(f"/api/v1/fact-check/{result_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == result_id


def test_get_fact_check_not_found(client):
    resp = client.get("/api/v1/fact-check/nonexistent-id-000")
    assert resp.status_code == 404


def test_feedback_submission(client, mock_fact_check):
    create_resp = client.post(
        "/api/v1/fact-check",
        json={"claim": "Turmeric cures all forms of cancer in humans."},
    )
    result_id = create_resp.json()["id"]

    feedback_resp = client.post(
        "/api/v1/feedback",
        json={"result_id": result_id, "rating": 4, "comment": "Helpful analysis."},
    )
    assert feedback_resp.status_code == 200
    assert "id" in feedback_resp.json()


def test_feedback_invalid_rating(client, mock_fact_check):
    create_resp = client.post(
        "/api/v1/fact-check",
        json={"claim": "Coffee prevents Alzheimer disease completely and with no side effects."},
    )
    result_id = create_resp.json()["id"]
    resp = client.post("/api/v1/feedback", json={"result_id": result_id, "rating": 10})
    assert resp.status_code == 422


def test_feedback_nonexistent_result(client):
    resp = client.post("/api/v1/feedback", json={"result_id": "fake-id", "rating": 3})
    assert resp.status_code == 404


def test_claim_normalization(client, mock_fact_check):
    # Extra whitespace should be normalized
    resp = client.post(
        "/api/v1/fact-check",
        json={"claim": "  Vaccines  cause   autism   in  children.  "},
    )
    assert resp.status_code == 200


def test_repeated_claim_reuses_saved_result(client, mock_fact_check):
    first = client.post("/api/v1/fact-check", json={"claim": "Does green tea cure the common cold?"})
    second = client.post("/api/v1/fact-check", json={"claim": "  does GREEN tea cure the common cold  "})
    assert first.status_code == 200 and second.status_code == 200
    assert second.json()["id"] == first.json()["id"]
    assert mock_fact_check.call_count == 1


def test_failed_analysis_is_not_reused(client, mock_fact_check):
    from app.services.fact_checker import FactCheckPipelineResult
    mock_fact_check.return_value = FactCheckPipelineResult(**{**MOCK_PIPELINE_RESULT, "error": "API error 500"})
    claim = {"claim": "Cold showers boost your immune system."}
    first = client.post("/api/v1/fact-check", json=claim)
    second = client.post("/api/v1/fact-check", json=claim)
    assert second.json()["id"] != first.json()["id"]
    assert mock_fact_check.call_count == 2
