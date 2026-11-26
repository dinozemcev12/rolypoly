import json
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database.base import BaseModel
from app.database.session import Base


class Game(BaseModel, Base):
    """Игровая сессия. Все игровые сущности привязаны к game_id."""

    __tablename__ = "games"

    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    game_period = Column(String(100), nullable=False, default="modern")  # modern | alternative
    start_year = Column(Integer, nullable=False, default=2026)
    max_players = Column(Integer, nullable=False, default=6)

    # Настройки (нормализованные ключевые поля + расширение через JSON)
    economy_settings = Column(JSON, nullable=True)      # настройки экономики
    diplomacy_settings = Column(JSON, nullable=True)    # настройки дипломатии
    turn_rules = Column(JSON, nullable=True)            # правила ходов
    visibility_settings = Column(JSON, nullable=True)   # настройки видимости информации

    status = Column(
        String(50), nullable=False, default="preparation"
    )  # preparation | waiting | active | paused | finished

    current_month = Column(String(20), nullable=True)   # текущий игровой месяц (YYYY-MM)
    current_turn_number = Column(Integer, nullable=False, default=0)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by = relationship("User", back_populates="created_games", foreign_keys=[created_by_id])

    # Связи
    members = relationship("GameMember", back_populates="game", cascade="all, delete-orphan")
    countries = relationship("Country", back_populates="game", cascade="all, delete-orphan")
    territories = relationship("Territory", back_populates="game", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="game", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="game", cascade="all, delete-orphan")
    game_turns = relationship("GameTurn", back_populates="game", cascade="all, delete-orphan")
    history_logs = relationship("HistoryLog", back_populates="game", cascade="all, delete-orphan")
    diplomatic_relations = relationship("DiplomaticRelation", back_populates="game", cascade="all, delete-orphan")
    treaties = relationship("Treaty", back_populates="game", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="game", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="game", cascade="all, delete-orphan")
    conflicts = relationship("Conflict", back_populates="game", cascade="all, delete-orphan")
    maps = relationship("GameMap", back_populates="game", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Game(id={self.id}, title={self.title}, status={self.status})>"
