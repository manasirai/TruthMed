"""Pytest fixtures for TruthMed backend tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base, get_db
from app.db.seed_organs import seed_organs


TEST_DATABASE_URL = "sqlite:///./test_truthmed.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestSessionLocal()
    seed_organs(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    from main import app
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
