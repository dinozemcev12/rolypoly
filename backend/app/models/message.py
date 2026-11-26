from sqlalchemy import (
    Column,
    String,
    Integer,
    ForeignKey,
    Text,
    DateTime,
    Boolean,
)
from sqlalchemy.orm import relationship

from app.database.base import BaseModel
from app.database.session import Base


class Message(BaseModel, Base):
    """Дипломатическое/системное сообщение между государствами/игроками."""

    __tablename__ = "messages"

    game_id = Column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recipient_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    recipient_country_id = Column(
        Integer, ForeignKey("countries.id", ondelete="CASCADE"), nullable=True, index=True
    )
    subject = Column(String(200), nullable=True)
    body = Column(Text, nullable=False)
    is_secret = Column(Boolean, default=False, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)

    game = relationship("Game")
    sender_user = relationship("User", foreign_keys=[sender_user_id])
    recipient_user = relationship("User", foreign_keys=[recipient_user_id])
    recipient_country = relationship("Country")

    def __repr__(self) -> str:
        return f"<Message(id={self.id}, game_id={self.game_id})>"
