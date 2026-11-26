from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.base import BaseModel
from app.database.session import Base


class User(BaseModel, Base):
    """Пользователь платформы. Роли: admin / gm (ведущий) / player."""

    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    role = Column(String(50), nullable=False, default="player")  # admin | gm | player
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # Связи
    game_members = relationship("GameMember", back_populates="user", cascade="all, delete-orphan")
    owned_countries = relationship("Country", back_populates="owner_user", foreign_keys="Country.owner_user_id")
    sent_orders = relationship("Order", back_populates="sender_user", foreign_keys="Order.sender_user_id")
    created_transactions = relationship("Transaction", back_populates="created_by_user")
    created_events = relationship("Event", back_populates="created_by_user")
    created_games = relationship("Game", back_populates="created_by_user")
    history_logs = relationship("HistoryLog", back_populates="user")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username}, role={self.role})>"
