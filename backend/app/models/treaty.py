from sqlalchemy import (
    Column,
    String,
    Integer,
    ForeignKey,
    Text,
    JSON,
    DateTime,
    Boolean,
    CheckConstraint,
)
from sqlalchemy.orm import relationship

from app.database.base import BaseModel
from app.database.session import Base


class Treaty(BaseModel, Base):
    """Договор между государствами."""

    __tablename__ = "treaties"

    game_id = Column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String(200), nullable=False)
    type = Column(String(100), nullable=False)  # alliance | trade | guarantee | ...
    country_a_id = Column(
        Integer, ForeignKey("countries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    country_b_id = Column(
        Integer, ForeignKey("countries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status = Column(
        String(50), nullable=False, default="proposed"
    )  # proposed | accepted | rejected | active | terminated
    is_secret = Column(Boolean, default=False, nullable=False)
    terms = Column(Text, nullable=True)
    parameters = Column(JSON, nullable=True)

    game = relationship("Game", back_populates="treaties")
    country_a = relationship("Country", foreign_keys=[country_a_id])
    country_b = relationship("Country", foreign_keys=[country_b_id])

    __table_args__ = (
        CheckConstraint(
            "status IN ('proposed','accepted','rejected','active','terminated')",
            name="ck_treaty_status",
        ),
    )

    def __repr__(self) -> str:
        return f"<Treaty(id={self.id}, title={self.title}, status={self.status})>"
