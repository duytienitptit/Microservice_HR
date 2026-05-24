from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    DATABASE_URL: str = Field(default="postgresql+asyncpg://user:password@localhost:5432/ai_db")
    RABBITMQ_URL: str = Field(default="amqp://guest:guest@localhost:5672/")
    CORE_SERVICE_URL: str = Field(default="http://localhost:3001")
    RAG_SERVICE_URL: str = Field(default="http://localhost:3003")
    LLM_PROVIDER: str = Field(default="openai")
    LLM_API_KEY: str = Field(default="")
    USE_LANGGRAPH: bool = Field(default=True)

    @property
    def async_database_url(self) -> str:
        """Ensure the DATABASE_URL uses the asyncpg driver."""
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def sync_database_url(self) -> str:
        """Return a synchronous database URL for table creation."""
        return self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
