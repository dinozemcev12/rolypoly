from sqlalchemy import (
    Column,
    String,
    Integer,
    ForeignKey,
    Text,
    JSON,
    Boolean,
)
from sqlalchemy.orm import relationship

from app.database.base import BaseModel
from app.database.session import Base


class GameMap(BaseModel, Base):
    """Карта игровой сессии (географическая или произвольная)."""

    __tablename__ = "maps"

    game_id = Column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String(200), nullable=False)
    type = Column(String(50), nullable=False, default="arbitrary")  # geographic | arbitrary
    image_url = Column(String(500), nullable=True)  # загруженное изображение основы
    settings = Column(JSON, nullable=True)  # настройки карты
    is_active = Column(Boolean, default=True, nullable=False)

    game = relationship("Game", back_populates="maps")
    layers = relationship("MapLayer", back_populates="map", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<GameMap(id={self.id}, name={self.name}, type={self.type})>"
