import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    RABBITMQ_URL: str = Field(default="amqp://guest:guest@localhost:5672/")
    DATABASE_URL: str = Field(default="sqlite:///rag.db")
    STORAGE_DIR: str = Field(default="./storage")
    EMBEDDING_PROVIDER: str = Field(default="local")
    EMBEDDING_MODEL: str = Field(default="all-MiniLM-L6-v2")
    QDRANT_URL: str = Field(default="http://localhost:6333")
    OPENAI_API_KEY: str | None = Field(default=None)
    GEMINI_API_KEY: str | None = Field(default=None)

    @property
    def sqlite_db_path(self) -> str:
        # SQLite db path parsing
        # sqlite:////absolute/path -> /absolute/path
        # sqlite:///relative/path -> relative/path
        if self.DATABASE_URL.startswith("sqlite:///"):
            return self.DATABASE_URL.replace("sqlite:///", "", 1)
        elif self.DATABASE_URL.startswith("sqlite://"):
            return self.DATABASE_URL.replace("sqlite://", "", 1)
        return self.DATABASE_URL

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
