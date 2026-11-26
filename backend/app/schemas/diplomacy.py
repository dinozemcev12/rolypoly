from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime


class TreatyCreate(BaseModel):
    game_id: int
    title: str = Field(..., min_length=1, max_length=200)
    type: str = Field("alliance", min_length=1, max_length=100)
    country_a_id: int
    country_b_id: int
    is_secret: bool = False
    terms: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None


class TreatyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    game_id: int
    title: str
    type: str
    country_a_id: int
    country_b_id: int
    status: str
    is_secret: bool
    terms: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    created_at: datetime


class TreatyStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(proposed|accepted|rejected|active|terminated)$")


class DiplomaticRelationUpsert(BaseModel):
    game_id: int
    country_a_id: int
    country_b_id: int
    relation_score: int = Field(..., ge=-100, le=100)
    status: str = "neutral"


class DiplomaticRelationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    game_id: int
    country_a_id: int
    country_b_id: int
    relation_score: int
    status: str
    updated_at: datetime
