from sqlalchemy import (
    Column,
    String,
    Integer,
    ForeignKey,
    Text,
    DateTime,
    Boolean,
    CheckConstraint,
)
from sqlalchemy.orm import relationship

from app.database.base import BaseModel
from app.database.session import Base


class Notification(BaseModel, Base):
    """Уведомление пользователя."""

    __tablename__ = "notifications"

    game_id = Column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String(200), nullable=False)
    text = Column(Text, nullable=False)
    type = Column(String(100), nullable=False)  # order | treaty | event | game | ...
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    link_url = Column(String(500), nullable=True)

    game = relationship("Game", back_populates="notifications")
    user = relationship("User")

    __table_args__ = (
        CheckConstraint(
            "type IN ('order','treaty','event','game','system','message')",
            name="ck_notification_type",
        ),
    )

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.type})>"
