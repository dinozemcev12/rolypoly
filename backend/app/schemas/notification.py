from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    game_id: int
    user_id: int
    title: str
    text: str
    type: str
    is_read: bool
    read_at: Optional[datetime] = None
    link_url: Optional[str] = None
    created_at: datetime
