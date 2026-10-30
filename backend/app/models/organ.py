from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Organ(Base):
    __tablename__ = "organs"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # e.g. "heart", "kidney"
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    system: Mapped[str] = mapped_column(String(50), nullable=False)  # cardiovascular, digestive, etc.
    location: Mapped[str] = mapped_column(Text, nullable=False)
    main_function: Mapped[str] = mapped_column(Text, nullable=False)
    major_structures: Mapped[str] = mapped_column(Text, nullable=False)
    system_interactions: Mapped[str] = mapped_column(Text, nullable=False)
    health_facts: Mapped[str] = mapped_column(Text, nullable=False)
    common_conditions: Mapped[str] = mapped_column(Text, nullable=False)
    symptoms: Mapped[str] = mapped_column(Text, nullable=False)
    prevention: Mapped[str] = mapped_column(Text, nullable=False)
    when_to_seek_care: Mapped[str] = mapped_column(Text, nullable=False)
    last_reviewed: Mapped[str] = mapped_column(String(20), nullable=False)
    content_source: Mapped[str] = mapped_column(Text, nullable=False)
    position_x: Mapped[float] = mapped_column(nullable=False, default=0.0)
    position_y: Mapped[float] = mapped_column(nullable=False, default=0.0)
    position_z: Mapped[float] = mapped_column(nullable=False, default=0.0)
    color: Mapped[str] = mapped_column(String(10), default="#e74c3c")

    sources: Mapped[list["OrganSource"]] = relationship(
        "OrganSource", back_populates="organ", cascade="all, delete-orphan", order_by="OrganSource.position"
    )


class OrganSource(Base):
    __tablename__ = "organ_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organ_id: Mapped[str] = mapped_column(String(50), ForeignKey("organs.id"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    publisher: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)

    organ: Mapped["Organ"] = relationship("Organ", back_populates="sources")
