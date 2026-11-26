from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class GameTurnBase(BaseModel):
    turn_number: int
    month_start: str  # YYYY-MM
    status: Optional[str] = "planning"


class GameTurnRead(GameTurnBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    game_id: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    started_by_user_id: Optional[int] = None
    completed_by_user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class GameTurnAction(BaseModel):
    action: str  # start | finish_review | resolve | publish | next
    month_start: Optional[str] = None
