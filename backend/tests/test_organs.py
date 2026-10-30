"""Tests for organ endpoints."""


def test_list_organs(client):
    resp = client.get("/api/v1/organs")
    assert resp.status_code == 200
    organs = resp.json()
    assert isinstance(organs, list)
    assert len(organs) >= 10  # We seed 11 organs
    ids = [o["id"] for o in organs]
    assert "heart" in ids
    assert "brain" in ids
    assert "kidneys" in ids


def test_get_organ_heart(client):
    resp = client.get("/api/v1/organs/heart")
    assert resp.status_code == 200
    organ = resp.json()
    assert organ["id"] == "heart"
    assert organ["name"] == "Heart"
    assert organ["system"] == "Cardiovascular"
    assert len(organ["main_function"]) > 50
    assert isinstance(organ["sources"], list)
    assert len(organ["sources"]) > 0


def test_get_organ_not_found(client):
    resp = client.get("/api/v1/organs/nonexistent_organ")
    assert resp.status_code == 404


def test_organ_sources(client):
    resp = client.get("/api/v1/organs/brain/sources")
    assert resp.status_code == 200
    sources = resp.json()
    assert isinstance(sources, list)
    assert len(sources) > 0
    for src in sources:
        assert "title" in src
        assert "publisher" in src


def test_all_seeded_organs_have_required_fields(client):
    resp = client.get("/api/v1/organs")
    for organ_summary in resp.json():
        detail_resp = client.get(f"/api/v1/organs/{organ_summary['id']}")
        assert detail_resp.status_code == 200
        o = detail_resp.json()
        for field in ["main_function", "common_conditions", "prevention", "when_to_seek_care"]:
            assert o[field], f"Organ {o['id']} missing field {field}"
