from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TransactionBase(BaseModel):
    country_id: int
    amount: int
    type: str  # income | expense | adjustment
    reason: str = Field(..., min_length=1)
    date: datetime
    status: Optional[str] = "confirmed"


class TransactionCreate(TransactionBase):
    pass


class TransactionRead(TransactionBase):
    id: int
    game_id: int
    created_by_user_id: int
    confirmed_by_user_id: Optional[int] = None
    confirmed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
