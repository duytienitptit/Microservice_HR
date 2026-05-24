import app.patch_forward_ref
import pytest
import pytest_asyncio
import os
from unittest.mock import AsyncMock
from app.config import settings

# Override settings for testing
settings.DATABASE_URL = "sqlite:///test_rag.db"
settings.STORAGE_DIR = "./test_storage"

from app.database import init_db, get_db_context
from app.main import app

@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    db_path = settings.sqlite_db_path
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except OSError:
            pass
            
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    await init_db()
    
    yield
    
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except OSError:
            pass
            
    if os.path.exists(settings.STORAGE_DIR):
        import shutil
        try:
            shutil.rmtree(settings.STORAGE_DIR)
        except OSError:
            pass

@pytest.fixture
def mock_rabbitmq(mocker):
    mock_chan = AsyncMock()
    mock_conn = AsyncMock()
    
    mocker.patch("app.events.connection.get_channel", return_value=mock_chan)
    mocker.patch("app.events.connection.connect_rabbitmq", return_value=mock_chan)
    mocker.patch("app.events.connection.is_connected", return_value=True)
    mocker.patch("app.main.is_connected", return_value=True)
    
    return mock_chan

@pytest_asyncio.fixture
async def client(mock_rabbitmq):
    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
