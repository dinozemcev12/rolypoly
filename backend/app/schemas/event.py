from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class EventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    text: str = Field(..., min_length=1)
    event_date: datetime
    category: str = Field(..., min_length=1, max_length=100)
    visibility: str = "public"  # public | player | secret
    related_country_ids: Optional[List[int]] = None
    related_territory_ids: Optional[List[int]] = None
    image_url: Optional[str] = None


class EventCreate(EventBase):
    game_id: int
    event_date: Optional[datetime] = None


class EventRead(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    game_id: int
    created_by_user_id: int
    created_at: datetime
