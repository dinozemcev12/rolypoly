from sqlalchemy import (
    Column,
    String,
    Integer,
    ForeignKey,
    Text,
    JSON,
    DateTime,
    CheckConstraint,
)
from sqlalchemy.orm import relationship

from app.database.base import BaseModel
from app.database.session import Base


class Conflict(BaseModel, Base):
    """Игровой конфликт (абстрактная механика для настольной игры)."""

    __tablename__ = "conflicts"

    game_id = Column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    causes = Column(Text, nullable=True)
    goals = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="open")  # open | active | resolved | closed
    participant_country_ids = Column(JSON, nullable=True)
    results = Column(Text, nullable=True)

    created_by_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False, index=True
    )

    game = relationship("Game", back_populates="conflicts")
    created_by_user = relationship("User")

    __table_args__ = (
        CheckConstraint(
            "status IN ('open','active','resolved','closed')",
            name="ck_conflict_status",
        ),
    )

    def __repr__(self) -> str:
        return f"<Conflict(id={self.id}, title={self.title}, status={self.status})>"
