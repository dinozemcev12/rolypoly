from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class ConflictCreate(BaseModel):
    game_id: int
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    causes: Optional[str] = None
    goals: Optional[str] = None
    participant_country_ids: Optional[List[int]] = None


class ConflictUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(open|active|resolved|closed)$")
    results: Optional[str] = None
    description: Optional[str] = None


class ConflictRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    game_id: int
    title: str
    description: str
    causes: Optional[str] = None
    goals: Optional[str] = None
    status: str
    participant_country_ids: Optional[List[int]] = None
    results: Optional[str] = None
    created_by_user_id: int
    created_at: datetime
