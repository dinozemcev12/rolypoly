from sqlalchemy import (
    Column,
    String,
    Integer,
    ForeignKey,
    Integer as SAInteger,
    Boolean,
    JSON,
)
from sqlalchemy.orm import relationship

from app.database.base import BaseModel
from app.database.session import Base


class MapLayer(BaseModel, Base):
    """Слой карты (политическая, физическая, экономическая и т.д.)."""

    __tablename__ = "map_layers"

    map_id = Column(
        Integer, ForeignKey("maps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String(200), nullable=False)
    type = Column(String(100), nullable=False)  # political | physical | economic | diplomatic | events | control
    is_visible = Column(Boolean, default=True, nullable=False)
    order_index = Column(SAInteger, nullable=False, default=0)
    settings = Column(JSON, nullable=True)

    map = relationship("GameMap", back_populates="layers")

    def __repr__(self) -> str:
        return f"<MapLayer(id={self.id}, name={self.name}, type={self.type})>"
