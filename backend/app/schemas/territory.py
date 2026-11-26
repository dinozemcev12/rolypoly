from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class TerritoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    country_id: Optional[int] = None
    geometry: Optional[Dict[str, Any]] = None  # GeoJSON geometry
    bounds_normalized: Optional[Dict[str, Any]] = None
    population: Optional[int] = 0
    resources: Optional[Dict[str, Any]] = None
    economic_indicators: Optional[Dict[str, Any]] = None
    additional_info: Optional[str] = None
    is_active: Optional[bool] = True


class TerritoryCreate(TerritoryBase):
    pass


class TerritoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    country_id: Optional[int] = None
    geometry: Optional[Dict[str, Any]] = None
    bounds_normalized: Optional[Dict[str, Any]] = None
    population: Optional[int] = None
    resources: Optional[Dict[str, Any]] = None
    economic_indicators: Optional[Dict[str, Any]] = None
    additional_info: Optional[str] = None
    is_active: Optional[bool] = None


class TerritoryRead(TerritoryBase):
    id: int
    game_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TerritoryOwnerAssign(BaseModel):
    country_id: int
