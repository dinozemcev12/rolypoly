from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    String,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database.base import BaseModel
from app.database.session import Base


class DiplomaticRelation(BaseModel, Base):
    """Отношения между двумя государствами (-100 .. +100)."""

    __tablename__ = "diplomatic_relations"

    game_id = Column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    country_a_id = Column(
        Integer, ForeignKey("countries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    country_b_id = Column(
        Integer, ForeignKey("countries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    relation_score = Column(
        Integer, nullable=False, default=0
    )  # -100 .. +100
    status = Column(String(50), nullable=False, default="neutral")  # neutral | allied | hostile | ...

    game = relationship("Game", back_populates="diplomatic_relations")
    country_a = relationship(
        "Country", foreign_keys=[country_a_id]
    )
    country_b = relationship(
        "Country", foreign_keys=[country_b_id]
    )

    __table_args__ = (
        CheckConstraint(
            "relation_score >= -100 AND relation_score <= 100",
            name="ck_diplomatic_relation_score",
        ),
        UniqueConstraint("game_id", "country_a_id", "country_b_id", name="uq_diplomatic_relation"),
    )

    def __repr__(self) -> str:
        return f"<DiplomaticRelation(game_id={self.game_id}, {self.country_a_id}-{self.country_b_id}, score={self.relation_score})>"
