from sqlalchemy import (
    Column,
    String,
    Integer,
    ForeignKey,
    DateTime,
    UniqueConstraint,
    Boolean,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.base import BaseModel
from app.database.session import Base


class GameMember(BaseModel, Base):
    """Участник игровой сессии."""

    __tablename__ = "game_members"

    game_id = Column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role_in_game = Column(
        String(50), nullable=False, default="player"
    )  # owner | gm | player | observer
    is_active = Column(Boolean, default=True, nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    game = relationship("Game", back_populates="members")
    user = relationship("User", back_populates="game_members")

    __table_args__ = (
        UniqueConstraint("game_id", "user_id", name="uq_game_member"),
    )

    def __repr__(self) -> str:
        return f"<GameMember(game_id={self.game_id}, user_id={self.user_id}, role={self.role_in_game})>"
