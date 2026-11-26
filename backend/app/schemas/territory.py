from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

from app.services.geojson_service import geometry_to_geojson


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
    game_id: int


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
    model_config = ConfigDict(from_attributes=True)

    id: int
    game_id: int
    created_at: datetime
    updated_at: datetime

    @field_validator("geometry", mode="before")
    @classmethod
    def serialize_geometry(cls, v: Any) -> Optional[Dict[str, Any]]:
        return geometry_to_geojson(v)


class TerritoryOwnerAssign(BaseModel):
    country_id: Optional[int] = None


class GeoJSONImportRequest(BaseModel):
    geojson: Dict[str, Any]
    default_country_id: Optional[int] = None
    replace_existing: bool = False


class GeoJSONImportResponse(BaseModel):
    imported_count: int
    territories: List[TerritoryRead]
