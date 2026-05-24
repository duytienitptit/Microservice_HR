import asyncio
import os
import uuid
import aiosqlite
from datetime import datetime, timezone
from app.database import get_db_context
from app.pipeline.pdf_parser import extract_text_from_pdf
from app.pipeline.info_extractor import extract_email, extract_name
from app.events.cv_ready_publisher import publish_cv_ready
from app.utils.logger import logger
from app.config import settings

def resolve_file_path(file_path: str) -> str:
    """
    Resolves the absolute file path, falling back to STORAGE_DIR if not found.
    """
    if os.path.exists(file_path):
        return file_path
    
    basename = os.path.basename(file_path)
    local_path = os.path.join(settings.STORAGE_DIR, basename)
    if os.path.exists(local_path):
        return local_path
        
    return file_path

async def process_cv(application_id: str, cv_file_path: str, correlation_id: str) -> dict:
    """
    Orchestrates the CV processing pipeline:
    1. Parse PDF with up to 2 retries (10s delay).
    2. Extract email and name.
    3. Run embedding pipeline (splits, embeds, stores in Qdrant, updates SQLite status).
    4. Publish CV_READY event.
    """
    logger.info(
        f"Starting CV processing", 
        application_id=application_id, 
        cv_file_path=cv_file_path,
        correlation_id=correlation_id
    )
    
    doc_id = uuid.uuid4().hex
    processed_at = datetime.now(timezone.utc).isoformat()
    resolved_path = resolve_file_path(cv_file_path)
    
    raw_text = None
    chunk_count = 0
    extracted_email = None
    extracted_name = None
    status = "FAILED"
    
    max_attempts = 3
    attempt = 0
    parse_success = False
    
    while attempt < max_attempts and not parse_success:
        attempt += 1
        try:
            logger.info(
                f"Parsing PDF attempt {attempt}/{max_attempts}", 
                application_id=application_id,
                resolved_path=resolved_path,
                correlation_id=correlation_id
            )
            raw_text, chunk_count = extract_text_from_pdf(resolved_path)
            parse_success = True
            status = "SUCCESS"
            logger.info(
                f"Successfully parsed PDF", 
                application_id=application_id,
                correlation_id=correlation_id
            )
        except Exception as e:
            logger.warning(
                f"Attempt {attempt}/{max_attempts} failed to parse PDF: {str(e)}",
                application_id=application_id,
                correlation_id=correlation_id
            )
            if attempt < max_attempts:
                logger.info(
                    "Waiting 10 seconds before retrying...", 
                    application_id=application_id,
                    correlation_id=correlation_id
                )
                await asyncio.sleep(10)
                
    if parse_success:
        # Extract info
        extracted_email = extract_email(raw_text)
        extracted_name = extract_name(raw_text)
        logger.info(
            f"Extracted info: email={extracted_email}, name={extracted_name}", 
            application_id=application_id,
            correlation_id=correlation_id
        )
        # Run Phase 2 embedding pipeline
        from app.pipeline.embedding_pipeline import run_embedding_pipeline
        chunk_count = await run_embedding_pipeline(
            application_id=application_id,
            raw_text=raw_text,
            doc_type="CV",
            correlation_id=correlation_id,
            fallback_chunk_count=chunk_count
        )
    else:
        logger.error(
            f"All {max_attempts} attempts to parse PDF failed", 
            application_id=application_id,
            correlation_id=correlation_id
        )
        # Save FAILED status to SQLite database
        async with get_db_context() as db:
            cursor = await db.execute(
                "SELECT id FROM documents WHERE application_id = ? AND type = 'CV'",
                (application_id,)
            )
            existing = await cursor.fetchone()
            
            if existing:
                doc_id = existing[0]
                await db.execute(
                    """
                    UPDATE documents 
                    SET raw_text = ?, status = ?, chunk_count = ?, processed_at = ?
                    WHERE id = ?
                    """,
                    (None, "FAILED", 0, processed_at, doc_id)
                )
            else:
                await db.execute(
                    """
                    INSERT INTO documents (id, application_id, type, raw_text, status, chunk_count, processed_at)
                    VALUES (?, ?, 'CV', ?, ?, ?, ?)
                    """,
                    (doc_id, application_id, None, "FAILED", 0, processed_at)
                )
            await db.commit()
            
    # Publish CV_READY event
    await publish_cv_ready(
        application_id=application_id,
        status="success" if status == "SUCCESS" else "failed",
        chunk_count=chunk_count,
        extracted_email=extracted_email,
        extracted_name=extracted_name,
        correlation_id=correlation_id
    )
    
    return {
        "id": doc_id,
        "application_id": application_id,
        "status": status,
        "extracted_email": extracted_email,
        "extracted_name": extracted_name,
        "chunk_count": chunk_count,
        "raw_text": raw_text
    }

async def query_document(application_id: str, query: str = None) -> dict | None:
    """
    Phase 1: Query raw text for the CV of application_id. No vector search.
    """
    async with get_db_context() as db:
        cursor = await db.execute(
            "SELECT application_id, raw_text, status FROM documents WHERE application_id = ? AND type = 'CV'",
            (application_id,)
        )
        row = await cursor.fetchone()
        if row:
            return dict(row)
        return None

async def get_status(application_id: str) -> dict | None:
    """
    Retrieves the document parsing status for application_id.
    """
    async with get_db_context() as db:
        cursor = await db.execute(
            "SELECT application_id, status, chunk_count, processed_at FROM documents WHERE application_id = ? AND type = 'CV'",
            (application_id,)
        )
        row = await cursor.fetchone()
        if not row:
            return None
            
        data = dict(row)
        
        # Determine has_embeddings and embedding_model
        has_embeddings = False
        if data["status"] == "SUCCESS" and data["chunk_count"] and data["chunk_count"] > 0:
            try:
                from app.vector_store.qdrant_store import QdrantStore
                qdrant = QdrantStore()
                collections = qdrant.client.get_collections().collections
                if any(c.name == qdrant.collection_name for c in collections):
                    # Check if Qdrant has points for this application_id
                    from qdrant_client.models import Filter, FieldCondition, MatchValue
                    res = qdrant.client.scroll(
                        collection_name=qdrant.collection_name,
                        scroll_filter=Filter(
                            must=[
                                FieldCondition(
                                    key="application_id",
                                    match=MatchValue(value=application_id)
                                )
                            ]
                        ),
                        limit=1
                    )
                    if res and res[0]:
                        has_embeddings = True
            except Exception:
                has_embeddings = False
                
        data["has_embeddings"] = has_embeddings
        
        try:
            from app.pipeline.embedder import get_embedder
            embedder = get_embedder()
            data["embedding_model"] = getattr(embedder, "model_name", "SentenceTransformer")
        except Exception:
            data["embedding_model"] = "SentenceTransformer"
            
        return data
