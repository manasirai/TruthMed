"""Tests for the health check endpoint."""


def test_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "analysis_configured" in data
    assert "retrieval_configured" in data
