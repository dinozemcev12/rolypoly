from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    country_id: int
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    cost: int = Field(0, ge=0)
    status: str = Field("planned", pattern="^(planned|active|completed|cancelled)$")


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    cost: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(None, pattern="^(planned|active|completed|cancelled)$")


class ProjectRead(BaseModel):
    id: int
    game_id: int
    country_id: int
    name: str
    description: Optional[str] = None
    cost: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
