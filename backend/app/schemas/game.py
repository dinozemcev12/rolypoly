from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class GameBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    game_period: Optional[str] = "modern"
    start_year: Optional[int] = 2026
    max_players: Optional[int] = Field(6, ge=1, le=50)
    economy_settings: Optional[dict] = None
    diplomacy_settings: Optional[dict] = None
    turn_rules: Optional[dict] = None
    visibility_settings: Optional[dict] = None


class GameCreate(GameBase):
    pass


class GameUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    game_period: Optional[str] = None
    start_year: Optional[int] = None
    max_players: Optional[int] = Field(None, ge=1, le=50)
    economy_settings: Optional[dict] = None
    diplomacy_settings: Optional[dict] = None
    turn_rules: Optional[dict] = None
    visibility_settings: Optional[dict] = None
    status: Optional[str] = None


class GameRead(GameBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    current_month: Optional[str] = None
    current_turn_number: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime


class GameMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    game_id: int
    user_id: int
    username: Optional[str] = None
    email: Optional[str] = None
    role_in_game: str
    is_active: bool
    joined_at: datetime
