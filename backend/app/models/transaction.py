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


class Transaction(BaseModel, Base):
    """Финансовая операция государства (казна)."""

    __tablename__ = "transactions"

    game_id = Column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    country_id = Column(
        Integer, ForeignKey("countries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount = Column(Integer, nullable=False)  # положительная = доход, отрицательная = расход
    type = Column(String(50), nullable=False)  # income | expense | adjustment
    reason = Column(Text, nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    status = Column(
        String(50), nullable=False, default="confirmed"
    )  # pending | confirmed | rejected

    created_by_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False, index=True
    )
    confirmed_by_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    confirmed_at = Column(DateTime(timezone=True), nullable=True)

    game = relationship("Game", back_populates="transactions")
    country = relationship("Country", back_populates="transactions")
    created_by_user = relationship(
        "User", foreign_keys=[created_by_user_id]
    )
    confirmed_by_user = relationship(
        "User", foreign_keys=[confirmed_by_user_id]
    )

    __table_args__ = (
        CheckConstraint(
            "type IN ('income','expense','adjustment')",
            name="ck_transaction_type",
        ),
        CheckConstraint(
            "status IN ('pending','confirmed','rejected')",
            name="ck_transaction_status",
        ),
    )

    def __repr__(self) -> str:
        return f"<Transaction(id={self.id}, country_id={self.country_id}, amount={self.amount})>"
