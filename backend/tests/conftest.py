import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, JSON
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Настраиваем тестовое окружение до импорта приложения
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-chars-long-12345")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from app.database.session import Base, get_db  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402
from app.models.territory import Territory  # noqa: E402

# Импортируем все модели, чтобы они зарегистрировались в Base.metadata
import app.models.user  # noqa: F401
import app.models.game  # noqa: F401
import app.models.game_member  # noqa: F401
import app.models.country  # noqa: F401
import app.models.territory  # noqa: F401
import app.models.order  # noqa: F401
import app.models.transaction  # noqa: F401
import app.models.game_turn  # noqa: F401
import app.models.history_log  # noqa: F401
import app.models.event  # noqa: F401
import app.models.notification  # noqa: F401
import app.models.diplomatic_relation  # noqa: F401
import app.models.treaty  # noqa: F401
import app.models.conflict  # noqa: F401
import app.models.map  # noqa: F401


SQLALCHEMY_TEST_URL = "sqlite:///:memory:"
test_engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# В тестовой SQLite-БД подменяем PostGIS Geometry на JSON
Territory.__table__.c.geometry.type = JSON()


@pytest.fixture()
def client():
    # Создаём все таблицы в тестовой БД
    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as c:
        yield c
    fastapi_app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
