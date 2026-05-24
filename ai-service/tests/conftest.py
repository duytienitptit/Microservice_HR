import os
import pytest
import pytest_asyncio
import uuid
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Override DATABASE_URL before importing app modules
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["RABBITMQ_URL"] = "amqp://guest:guest@localhost:5672/"
os.environ["CORE_SERVICE_URL"] = "http://localhost:3001"
os.environ["RAG_SERVICE_URL"] = "http://localhost:3003"

from app.database import Base


# ─── Database Fixtures ────────────────────────────────────


@pytest_asyncio.fixture
async def db_engine():
    """Create an in-memory SQLite async engine for testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine):
    """Provide a clean async session for each test."""
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session


# ─── Mock Fixtures ────────────────────────────────────────


@pytest.fixture
def mock_publish():
    """Mock the RabbitMQ publish function."""
    with patch("app.services.interview_service.publish_interview_completed", new_callable=AsyncMock) as mock:
        yield mock


@pytest.fixture
def sample_application_id():
    """Return a consistent UUID for testing."""
    return str(uuid.uuid4())
