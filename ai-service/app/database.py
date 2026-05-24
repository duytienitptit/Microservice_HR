from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings
from app.utils.logger import logger


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.async_database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Create all tables on startup."""
    # Import models so they register with Base.metadata
    from app.models import interview_session, chat_message  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified")


async def get_db():
    """FastAPI dependency — yields an async session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
