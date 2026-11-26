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


class Order(BaseModel, Base):
    """Игровой приказ игрока."""

    __tablename__ = "orders"

    game_id = Column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    country_id = Column(
        Integer, ForeignKey("countries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)  # экономика | дипломатия | и т.д.
    description = Column(Text, nullable=False)
    target = Column(String(200), nullable=True)  # цель приказа
    parameters = Column(JSON, nullable=True)  # дополнительные параметры

    status = Column(
        String(50), nullable=False, default="draft"
    )  # draft | sent | under_review | accepted | rejected | executed | cancelled

    sent_at = Column(DateTime(timezone=True), nullable=True)
    gm_comment = Column(Text, nullable=True)
    gm_decision_at = Column(DateTime(timezone=True), nullable=True)
    decided_by_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    result = Column(Text, nullable=True)  # результат выполнения (ведущий)

    game = relationship("Game", back_populates="orders")
    country = relationship("Country", back_populates="orders")
    sender_user = relationship(
        "User", back_populates="sent_orders", foreign_keys=[sender_user_id]
    )
    decided_by_user = relationship(
        "User", foreign_keys=[decided_by_user_id]
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','sent','under_review','accepted','rejected','executed','cancelled')",
            name="ck_order_status",
        ),
    )

    def __repr__(self) -> str:
        return f"<Order(id={self.id}, title={self.title}, status={self.status})>"
