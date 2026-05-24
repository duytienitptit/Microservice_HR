import pytest
from app.pipeline.text_splitter import split_document

def test_split_document_basic():
    raw_text = "Page 1 Content\nSome extra text here.\n\nPage 2 Content\nMore text here."
    chunks = split_document(raw_text, source="CV", chunk_size=50, chunk_overlap=10)
    
    assert len(chunks) >= 2
    assert chunks[0]["metadata"]["source"] == "CV"
    assert chunks[0]["metadata"]["page_number"] == 1
    assert chunks[0]["metadata"]["chunk_index"] == 0
    
    # Verify page 2 chunks exist and have correct page number
    page_2_chunks = [c for c in chunks if c["metadata"]["page_number"] == 2]
    assert len(page_2_chunks) > 0
    assert page_2_chunks[0]["metadata"]["chunk_index"] > 0
