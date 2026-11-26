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

from geoalchemy2 import Geometry

from app.database.base import BaseModel
from app.database.session import Base


class Territory(BaseModel, Base):
    """Территория. Геометрия хранится в PostGIS (географическая карта)
    или нормализованные координаты (произвольная карта)."""

    __tablename__ = "territories"

    game_id = Column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    country_id = Column(
        Integer,
        ForeignKey("countries.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )  # владелец территории (государство)
    name = Column(String(200), nullable=False, index=True)
    geometry = Column(Geometry("MULTIPOLYGON", srid=4326), nullable=True)
    # Для произвольных карт: нормализованные координаты 0..1relative к изображению
    bounds_normalized = Column(JSON, nullable=True)

    population = Column(Integer, nullable=False, default=0)
    resources = Column(JSON, nullable=True)
    economic_indicators = Column(JSON, nullable=True)
    additional_info = Column(Text, nullable=True)  # информация от ведущего

    is_active = Column(Boolean, default=True, nullable=False)

    game = relationship("Game", back_populates="territories")
    country = relationship(
        "Country", back_populates="territories", foreign_keys=[country_id]
    )

    def __repr__(self) -> str:
        return f"<Territory(id={self.id}, name={self.name}, game_id={self.game_id})>"
