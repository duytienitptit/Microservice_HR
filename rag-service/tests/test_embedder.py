import pytest
import numpy as np
from app.pipeline.embedder import SentenceTransformerEmbedder, get_embedder

def test_sentence_transformer_embedder(mocker):
    # Mock SentenceTransformer class
    mock_model = mocker.Mock()
    # Mock encode method to return numpy array of floats
    mock_model.encode.side_effect = lambda texts, **kwargs: (
        np.ones((len(texts), 384)) if isinstance(texts, list) else np.ones(384)
    )
    
    # Patch the class in sentence_transformers
    mocker.patch("sentence_transformers.SentenceTransformer", return_value=mock_model)
    
    embedder = SentenceTransformerEmbedder(model_name="all-MiniLM-L6-v2")
    
    # Test dimension
    assert embedder.dimension == 384
    
    # Test embed_documents
    docs = ["chunk 1", "chunk 2"]
    embeddings = embedder.embed_documents(docs)
    assert len(embeddings) == 2
    assert len(embeddings[0]) == 384
    assert embeddings[0][0] == 1.0
    
    # Test embed_query
    query_emb = embedder.embed_query("query text")
    assert len(query_emb) == 384
    assert query_emb[0] == 1.0
    
    # Verify mock was called
    assert mock_model.encode.call_count == 2
