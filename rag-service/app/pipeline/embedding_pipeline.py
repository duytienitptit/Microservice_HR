from datetime import datetime, timezone
from app.pipeline.text_splitter import split_document
from app.pipeline.embedder import get_embedder
from app.vector_store.qdrant_store import QdrantStore
from app.database import get_db_context
from app.utils.logger import logger

async def run_embedding_pipeline(
    application_id: str,
    raw_text: str,
    doc_type: str,
    correlation_id: str = None,
    fallback_chunk_count: int = None
) -> int:
    """
    Runs the full embedding pipeline:
    1. Splits the raw_text into chunks using RecursiveCharacterTextSplitter.
    2. Embeds the chunks.
    3. Saves vectors to Qdrant.
    4. Updates document record in SQLite database.
    
    If embedding/Qdrant steps fail, falls back to raw text availability in SQLite
    (updating SQLite with status='SUCCESS' and estimated page count, but skipping Qdrant).
    
    Returns:
        int: The number of chunks processed.
    """
    logger.info(
        f"Running embedding pipeline",
        application_id=application_id,
        doc_type=doc_type,
        correlation_id=correlation_id
    )
    
    processed_at = datetime.now(timezone.utc).isoformat()
    status = "SUCCESS"
    chunk_count = 0
    embedding_failed = False
    
    try:
        # Step 1: Text splitting
        chunks = split_document(raw_text, source=doc_type)
        chunk_count = len(chunks)
        
        if chunk_count > 0:
            # Step 2: Embed chunks
            embedder = get_embedder()
            texts = [c["content"] for c in chunks]
            embeddings = embedder.embed_documents(texts)
            
            # Step 3: Upsert to Qdrant
            qdrant_store = QdrantStore()
            qdrant_store.delete_by_application(application_id)
            qdrant_store.upsert_vectors(
                application_id=application_id,
                chunks=chunks,
                embeddings=embeddings,
                doc_type=doc_type
            )
        else:
            logger.warning(
                "No chunks generated from raw text",
                application_id=application_id,
                correlation_id=correlation_id
            )
    except Exception as e:
        logger.error(
            f"Embedding pipeline failed for {application_id}: {str(e)}. Proceeding with fallback.",
            correlation_id=correlation_id
        )
        embedding_failed = True
        # Fallback estimated page count
        if fallback_chunk_count is not None:
            chunk_count = fallback_chunk_count
        else:
            chunk_count = max(1, len(raw_text.split("\n\n")))
        
    # Step 4: Update SQLite Database
    async with get_db_context() as db:
        cursor = await db.execute(
            "SELECT id FROM documents WHERE application_id = ? AND type = ?",
            (application_id, doc_type)
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
                (raw_text, status, chunk_count, processed_at, doc_id)
            )
        else:
            import uuid
            doc_id = uuid.uuid4().hex
            await db.execute(
                """
                INSERT INTO documents (id, application_id, type, raw_text, status, chunk_count, processed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (doc_id, application_id, doc_type, raw_text, status, chunk_count, processed_at)
            )
        await db.commit()
        
    logger.info(
        f"Database record updated",
        application_id=application_id,
        doc_type=doc_type,
        chunk_count=chunk_count,
        embedding_failed=embedding_failed
    )
    
    return chunk_count
