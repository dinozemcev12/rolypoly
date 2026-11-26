from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class CountryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    flag_url: Optional[str] = None
    color: Optional[str] = "#4B91D1"
    capital_territory_id: Optional[int] = None
    owner_user_id: Optional[int] = None
    population: Optional[int] = 0
    treasury: Optional[int] = 0
    gdp: Optional[int] = 0
    income: Optional[int] = 0
    expenses: Optional[int] = 0
    debt: Optional[int] = 0
    inflation: Optional[int] = 0
    resources: Optional[Dict[str, Any]] = None
    political_info: Optional[str] = None
    history: Optional[str] = None
    is_active: Optional[bool] = True


class CountryCreate(CountryBase):
    pass


class CountryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    flag_url: Optional[str] = None
    color: Optional[str] = None
    capital_territory_id: Optional[int] = None
    owner_user_id: Optional[int] = None
    population: Optional[int] = None
    treasury: Optional[int] = None
    gdp: Optional[int] = None
    income: Optional[int] = None
    expenses: Optional[int] = None
    debt: Optional[int] = None
    inflation: Optional[int] = None
    resources: Optional[Dict[str, Any]] = None
    political_info: Optional[str] = None
    history: Optional[str] = None
    is_active: Optional[bool] = None


class CountryRead(CountryBase):
    id: int
    game_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
