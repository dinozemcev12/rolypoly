from sqlalchemy import (
    Column,
    String,
    Integer,
    ForeignKey,
    Text,
    DateTime,
    CheckConstraint,
)
from sqlalchemy.orm import relationship

from app.database.base import BaseModel
from app.database.session import Base


class Project(BaseModel, Base):
    """Экономический проект государства."""

    __tablename__ = "projects"

    game_id = Column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    country_id = Column(
        Integer, ForeignKey("countries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    cost = Column(Integer, nullable=False, default=0)
    status = Column(
        String(50), nullable=False, default="planned"
    )  # planned | active | completed | cancelled

    game = relationship("Game")
    country = relationship("Country")

    __table_args__ = (
        CheckConstraint(
            "status IN ('planned','active','completed','cancelled')",
            name="ck_project_status",
        ),
    )

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name={self.name}, status={self.status})>"
