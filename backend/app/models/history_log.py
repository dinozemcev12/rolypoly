from sqlalchemy import (
    Column,
    String,
    Integer,
    ForeignKey,
    Text,
    DateTime,
    JSON,
)
from sqlalchemy.orm import relationship

from app.database.base import BaseModel
from app.database.session import Base


class HistoryLog(BaseModel, Base):
    """Запись журнала истории изменений в игре."""

    __tablename__ = "history_logs"

    game_id = Column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action_type = Column(String(100), nullable=False, index=True)  # тип события
    description = Column(Text, nullable=False)
    related_object_type = Column(String(100), nullable=True)  # country | territory | order | ...
    related_object_id = Column(Integer, nullable=True)
    turn_number = Column(Integer, nullable=True)
    metadata = Column(JSON, nullable=True)  # дополнительные данные изменения

    game = relationship("Game", back_populates="history_logs")
    user = relationship("User", back_populates="history_logs")

    def __repr__(self) -> str:
        return f"<HistoryLog(id={self.id}, action_type={self.action_type}, game_id={self.game_id})>"
