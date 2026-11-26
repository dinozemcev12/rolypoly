from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    game_id: int
    recipient_user_id: Optional[int] = None
    recipient_country_id: Optional[int] = None
    subject: Optional[str] = Field(None, max_length=200)
    body: str = Field(..., min_length=1)
    is_secret: bool = False


class MessageRead(BaseModel):
    id: int
    game_id: int
    sender_user_id: int
    recipient_user_id: Optional[int] = None
    recipient_country_id: Optional[int] = None
    subject: Optional[str] = None
    body: str
    is_secret: bool
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
