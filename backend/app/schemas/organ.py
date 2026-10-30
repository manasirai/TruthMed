from __future__ import annotations

from pydantic import BaseModel


class OrganSourceOut(BaseModel):
    title: str
    publisher: str
    url: str | None

    model_config = {"from_attributes": True}


class OrganOut(BaseModel):
    id: str
    name: str
    system: str
    location: str
    main_function: str
    major_structures: str
    system_interactions: str
    health_facts: str
    common_conditions: str
    symptoms: str
    prevention: str
    when_to_seek_care: str
    last_reviewed: str
    content_source: str
    position_x: float
    position_y: float
    position_z: float
    color: str
    sources: list[OrganSourceOut]

    model_config = {"from_attributes": True}


class OrganSummary(BaseModel):
    id: str
    name: str
    system: str
    color: str
    position_x: float
    position_y: float
    position_z: float

    model_config = {"from_attributes": True}
