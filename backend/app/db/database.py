from __future__ import annotations

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables() -> None:
    from app.models import fact_check, organ  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _add_missing_columns()


def _add_missing_columns() -> None:
    # create_all() does not alter existing tables, so add columns introduced after the DB was created.
    columns = {c["name"] for c in inspect(engine).get_columns("fact_check_requests")}
    if "claim_normalized" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE fact_check_requests ADD COLUMN claim_normalized TEXT"))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_fact_check_requests_claim_normalized "
                "ON fact_check_requests (claim_normalized)"
            ))
