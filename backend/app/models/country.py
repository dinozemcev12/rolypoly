from sqlalchemy import (
    Column,
    String,
    Integer,
    ForeignKey,
    Text,
    JSON,
    Boolean,
    CheckConstraint,
)
from sqlalchemy.orm import relationship

from app.database.base import BaseModel
from app.database.session import Base


class Country(BaseModel, Base):
    """Государство в рамках игровой сессии."""

    __tablename__ = "countries"

    game_id = Column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String(200), nullable=False)
    flag_url = Column(String(500), nullable=True)
    color = Column(String(20), nullable=False, default="#4B91D1")  # цвет на карте
    capital_territory_id = Column(
        Integer, ForeignKey("territories.id", ondelete="SET NULL"), nullable=True
    )
    owner_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )  # игрок, управляющий государством

    population = Column(Integer, nullable=False, default=0)
    treasury = Column(Integer, nullable=False, default=0)  # казна (в условных единицах)
    gdp = Column(Integer, nullable=False, default=0)
    income = Column(Integer, nullable=False, default=0)
    expenses = Column(Integer, nullable=False, default=0)
    debt = Column(Integer, nullable=False, default=0)
    inflation = Column(Integer, nullable=False, default=0)  # в процентах * 100

    resources = Column(JSON, nullable=True)  # ресурсы: {"нефть": 100, "зерно": 50}
    political_info = Column(Text, nullable=True)  # политическая информация
    history = Column(Text, nullable=True)  # история государства

    is_active = Column(Boolean, default=True, nullable=False)

    game = relationship("Game", back_populates="countries")
    owner_user = relationship(
        "User", back_populates="owned_countries", foreign_keys=[owner_user_id]
    )
    capital_territory = relationship(
        "Territory", foreign_keys=[capital_territory_id]
    )
    territories = relationship(
        "Territory", back_populates="country", foreign_keys="Territory.country_id"
    )

    __table_args__ = (
        CheckConstraint("inflation >= 0", name="ck_country_inflation_nonneg"),
    )

    def __repr__(self) -> str:
        return f"<Country(id={self.id}, name={self.name}, game_id={self.game_id})>"
