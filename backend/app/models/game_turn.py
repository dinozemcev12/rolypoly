from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    DateTime,
    String,
    CheckConstraint,
)
from sqlalchemy.orm import relationship

from app.database.base import BaseModel
from app.database.session import Base


class GameTurn(BaseModel, Base):
    """Игровой ход (месяц)."""

    __tablename__ = "game_turns"

    game_id = Column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    turn_number = Column(Integer, nullable=False)
    month_start = Column(String(20), nullable=False)  # YYYY-MM
    status = Column(
        String(50), nullable=False, default="planning"
    )  # planning | review | resolved | published

    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    started_by_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    completed_by_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    game = relationship("Game", back_populates="game_turns")

    __table_args__ = (
        CheckConstraint(
            "status IN ('planning','review','resolved','published')",
            name="ck_game_turn_status",
        ),
        UniqueConstraint("game_id", "turn_number", name="uq_game_turn_number"),
    )

    def __repr__(self) -> str:
        return f"<GameTurn(game_id={self.game_id}, turn_number={self.turn_number}, status={self.status})>"
