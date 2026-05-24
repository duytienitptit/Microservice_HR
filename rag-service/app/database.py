import os
import aiosqlite
from contextlib import asynccontextmanager
from app.config import settings
from app.utils.logger import logger

async def init_db():
    db_path = settings.sqlite_db_path
    
    # Create parent directory if it doesn't exist
    db_dir = os.path.dirname(os.path.abspath(db_path))
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
        
    async with aiosqlite.connect(db_path) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id              TEXT PRIMARY KEY,
                application_id  TEXT NOT NULL,
                type            TEXT CHECK (type IN ('CV', 'JD')),
                raw_text        TEXT,
                status          TEXT DEFAULT 'PENDING',
                chunk_count     INTEGER,
                processed_at    DATETIME
            );
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_application_id 
            ON documents(application_id);
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS cv_analyses (
                id              TEXT PRIMARY KEY,
                application_id  TEXT NOT NULL UNIQUE,
                job_title       TEXT,
                job_requirements TEXT,
                analysis_json   TEXT NOT NULL,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_cv_analyses_application_id
            ON cv_analyses(application_id);
        """)
        await db.commit()
    logger.info(f"Database initialized successfully", db_path=db_path)

@asynccontextmanager
async def get_db_context():
    async with aiosqlite.connect(settings.sqlite_db_path) as db:
        db.row_factory = aiosqlite.Row
        yield db

async def get_db():
    async with get_db_context() as db:
        yield db
