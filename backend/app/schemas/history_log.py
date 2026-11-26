from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class HistoryLogRead(BaseModel):
    id: int
    game_id: int
    user_id: Optional[int] = None
    action_type: str
    description: str
    related_object_type: Optional[str] = None
    related_object_id: Optional[int] = None
    turn_number: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
