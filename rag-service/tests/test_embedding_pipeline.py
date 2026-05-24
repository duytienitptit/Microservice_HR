import pytest
from unittest.mock import MagicMock, AsyncMock
from app.pipeline.embedding_pipeline import run_embedding_pipeline
from app.database import get_db_context

@pytest.mark.asyncio
async def test_embedding_pipeline_happy_path(mocker):
    # Mock text splitter
    mock_chunks = [
        {"content": "chunk 1", "metadata": {"source": "CV", "page_number": 1, "chunk_index": 0}},
        {"content": "chunk 2", "metadata": {"source": "CV", "page_number": 1, "chunk_index": 1}}
    ]
    mocker.patch("app.pipeline.embedding_pipeline.split_document", return_value=mock_chunks)
    
    # Mock embedder
    mock_embedder = MagicMock()
    mock_embedder.embed_documents.return_value = [[0.1] * 384, [0.2] * 384]
    mocker.patch("app.pipeline.embedding_pipeline.get_embedder", return_value=mock_embedder)
    
    # Mock Qdrant Store
    mock_qdrant = MagicMock()
    mocker.patch("app.pipeline.embedding_pipeline.QdrantStore", return_value=mock_qdrant)
    
    # Run pipeline
    chunk_count = await run_embedding_pipeline(
        application_id="app-happy",
        raw_text="Page 1 Content\n\nPage 2 Content",
        doc_type="CV",
        correlation_id="corr-happy"
    )
    
    assert chunk_count == 2
    
    # Verify qdrant calls
    mock_qdrant.delete_by_application.assert_called_once_with("app-happy")
    mock_qdrant.upsert_vectors.assert_called_once()
    
    # Verify SQLite DB update
    async with get_db_context() as db:
        cursor = await db.execute("SELECT status, chunk_count FROM documents WHERE application_id = ?", ("app-happy",))
        row = await cursor.fetchone()
        assert row is not None
        assert row["status"] == "SUCCESS"
        assert row["chunk_count"] == 2


@pytest.mark.asyncio
async def test_embedding_pipeline_fallback(mocker):
    # Mock text splitter to generate some chunks
    mock_chunks = [
        {"content": "chunk 1", "metadata": {"source": "CV", "page_number": 1, "chunk_index": 0}}
    ]
    mocker.patch("app.pipeline.embedding_pipeline.split_document", return_value=mock_chunks)
    
    # Mock embedder to raise an exception (simulating failure)
    mocker.patch("app.pipeline.embedding_pipeline.get_embedder", side_effect=Exception("Embedding model error"))
    
    # Run pipeline - should fallback, NOT raise
    chunk_count = await run_embedding_pipeline(
        application_id="app-fallback",
        raw_text="Page 1 Content\n\nPage 2 Content",
        doc_type="CV",
        correlation_id="corr-fallback"
    )
    
    # It should estimate chunk_count from pages (we split by \n\n: "Page 1 Content", "Page 2 Content" -> 2 pages)
    assert chunk_count == 2
    
    # Verify SQLite DB update (status must be SUCCESS for fallback raw text access)
    async with get_db_context() as db:
        cursor = await db.execute("SELECT status, chunk_count FROM documents WHERE application_id = ?", ("app-fallback",))
        row = await cursor.fetchone()
        assert row is not None
        assert row["status"] == "SUCCESS"
        assert row["chunk_count"] == 2
