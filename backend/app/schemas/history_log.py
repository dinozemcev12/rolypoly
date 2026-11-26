from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime


class HistoryLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    game_id: int
    user_id: Optional[int] = None
    action_type: str
    description: str
    related_object_type: Optional[str] = None
    related_object_id: Optional[int] = None
    turn_number: Optional[int] = None
    log_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
