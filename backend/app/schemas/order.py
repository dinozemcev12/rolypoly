from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class OrderBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    category: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1)
    target: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None


class OrderCreate(OrderBase):
    country_id: int


class OrderUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[str] = None
    description: Optional[str] = None
    target: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


class OrderDecision(BaseModel):
    status: str  # accepted | rejected | executed | cancelled | returned
    gm_comment: Optional[str] = None
    result: Optional[str] = None


class OrderRead(OrderBase):
    id: int
    game_id: int
    country_id: int
    sender_user_id: int
    status: str
    sent_at: Optional[datetime] = None
    gm_comment: Optional[str] = None
    gm_decision_at: Optional[datetime] = None
    decided_by_user_id: Optional[int] = None
    result: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
