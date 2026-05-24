import pytest
from unittest.mock import MagicMock
from app.vector_store.qdrant_store import QdrantStore

def test_qdrant_store_lifecycle(mocker):
    # Mock QdrantClient and its methods
    mock_client = MagicMock()
    mocker.patch("qdrant_client.QdrantClient", return_value=mock_client)
    
    # Mock get_collections to return empty collection list
    mock_collections_res = MagicMock()
    mock_collections_res.collections = []
    mock_client.get_collections.return_value = mock_collections_res
    
    store = QdrantStore()
    
    # Mock embedder for search
    mock_embedder = MagicMock()
    mock_embedder.embed_query.return_value = [0.1] * 384
    mocker.patch("app.pipeline.embedder.get_embedder", return_value=mock_embedder)
    
    # 1. Test recreate_collection
    store.recreate_collection(384)
    mock_client.create_collection.assert_called_once()
    
    # Reset mock for create_collection
    mock_client.create_collection.reset_mock()
    
    # Mock collection now exists
    mock_col = MagicMock()
    mock_col.name = "documents"
    mock_collections_res.collections = [mock_col]
    
    store.recreate_collection(384)
    # create_collection should NOT be called since collection exists
    mock_client.create_collection.assert_not_called()
    
    # 2. Test upsert_vectors
    chunks = [{"content": "chunk content", "metadata": {"page_number": 1, "chunk_index": 0}}]
    embeddings = [[0.2] * 384]
    store.upsert_vectors("app-123", chunks, embeddings, doc_type="CV")
    mock_client.upsert.assert_called_once()
    
    # 3. Test search
    mock_search_res = MagicMock()
    mock_search_res.payload = {"content": "chunk content", "metadata": {"page_number": 1}}
    mock_search_res.score = 0.95
    mock_client.search.return_value = [mock_search_res]
    
    results = store.search("test query", "app-123", top_k=5)
    assert len(results) == 1
    assert results[0]["content"] == "chunk content"
    assert results[0]["score"] == 0.95
    
    # 4. Test delete
    store.delete_by_application("app-123")
    mock_client.delete.assert_called_once()
