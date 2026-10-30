from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.organ import Organ
from app.schemas.organ import OrganOut, OrganSummary

router = APIRouter(prefix="/api/v1", tags=["organs"])


@router.get("/organs", response_model=list[OrganSummary])
def list_organs(db: Session = Depends(get_db)) -> list[OrganSummary]:
    organs = db.query(Organ).all()
    return [
        OrganSummary(
            id=o.id,
            name=o.name,
            system=o.system,
            color=o.color,
            position_x=o.position_x,
            position_y=o.position_y,
            position_z=o.position_z,
        )
        for o in organs
    ]


@router.get("/organs/{organ_id}", response_model=OrganOut)
def get_organ(organ_id: str, db: Session = Depends(get_db)) -> OrganOut:
    organ = db.query(Organ).filter_by(id=organ_id).first()
    if not organ:
        raise HTTPException(status_code=404, detail=f"Organ '{organ_id}' not found")
    return OrganOut(
        id=organ.id,
        name=organ.name,
        system=organ.system,
        location=organ.location,
        main_function=organ.main_function,
        major_structures=organ.major_structures,
        system_interactions=organ.system_interactions,
        health_facts=organ.health_facts,
        common_conditions=organ.common_conditions,
        symptoms=organ.symptoms,
        prevention=organ.prevention,
        when_to_seek_care=organ.when_to_seek_care,
        last_reviewed=organ.last_reviewed,
        content_source=organ.content_source,
        position_x=organ.position_x,
        position_y=organ.position_y,
        position_z=organ.position_z,
        color=organ.color,
        sources=[
            {"title": s.title, "publisher": s.publisher, "url": s.url}
            for s in organ.sources
        ],
    )


@router.get("/organs/{organ_id}/sources")
def get_organ_sources(organ_id: str, db: Session = Depends(get_db)):
    organ = db.query(Organ).filter_by(id=organ_id).first()
    if not organ:
        raise HTTPException(status_code=404, detail=f"Organ '{organ_id}' not found")
    return [{"title": s.title, "publisher": s.publisher, "url": s.url} for s in organ.sources]
