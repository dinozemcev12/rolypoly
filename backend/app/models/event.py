from sqlalchemy import (
    Column,
    String,
    Integer,
    ForeignKey,
    Text,
    DateTime,
    JSON,
    CheckConstraint,
)
from sqlalchemy.orm import relationship

from app.database.base import BaseModel
from app.database.session import Base


class Event(BaseModel, Base):
    """Игровое событие / новость."""

    __tablename__ = "events"

    game_id = Column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String(200), nullable=False)
    text = Column(Text, nullable=False)
    event_date = Column(DateTime(timezone=True), nullable=False)
    category = Column(String(100), nullable=False)  # политика | экономика | дипломатия | ...
    visibility = Column(
        String(50), nullable=False, default="public"
    )  # public | player | secret
    related_country_ids = Column(JSON, nullable=True)  # список ID государств
    related_territory_ids = Column(JSON, nullable=True)  # список ID территорий
    image_url = Column(String(500), nullable=True)

    created_by_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False, index=True
    )

    game = relationship("Game", back_populates="events")
    created_by_user = relationship("User", back_populates="created_events")

    __table_args__ = (
        CheckConstraint(
            "visibility IN ('public','player','secret')",
            name="ck_event_visibility",
        ),
    )

    def __repr__(self) -> str:
        return f"<Event(id={self.id}, title={self.title}, visibility={self.visibility})>"
