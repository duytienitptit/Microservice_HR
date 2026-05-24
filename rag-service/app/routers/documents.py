from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from app.services.document_service import process_cv, query_document, get_status
from app.services.cv_analyzer import analyze_cv, DocumentNotFoundError
from app.utils.logger import logger, correlation_id_var

router = APIRouter(prefix="/internal/documents")

class ParseRequest(BaseModel):
    application_id: str
    cv_file_path: str

class QueryRequest(BaseModel):
    application_id: str
    query: str | None = None
    query_text: str | None = None
    top_k: int | None = 5

class IndexJDRequest(BaseModel):
    job_id: str
    title: str
    description: str
    requirements: str

class AnalyzeRequest(BaseModel):
    job_title: str | None = None
    job_requirements: str | None = None

@router.post("/parse")
async def parse_cv_endpoint(
    request: ParseRequest, 
    x_correlation_id: str | None = Header(None)
):
    correlation_id = x_correlation_id or "unknown"
    token = correlation_id_var.set(correlation_id)
    try:
        logger.info(
            f"Manual parse request received", 
            application_id=request.application_id, 
            cv_file_path=request.cv_file_path,
            correlation_id=correlation_id
        )
        result = await process_cv(request.application_id, request.cv_file_path, correlation_id)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error(f"Manual parse failed: {str(e)}", correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "PARSE_FAILED", "message": str(e)}
        )
    finally:
        correlation_id_var.reset(token)

@router.post("/query")
async def query_document_endpoint(
    request: QueryRequest,
    x_correlation_id: str | None = Header(None)
):
    correlation_id = x_correlation_id or "unknown"
    token = correlation_id_var.set(correlation_id)
    try:
        logger.info(
            f"Query request received for application {request.application_id}", 
            application_id=request.application_id,
            correlation_id=correlation_id
        )
        
        q_text = request.query_text or request.query
        if q_text:
            try:
                from app.vector_store.qdrant_store import QdrantStore
                qdrant = QdrantStore()
                results = qdrant.search(
                    query_text=q_text,
                    application_id=request.application_id,
                    top_k=request.top_k or 5
                )
                return {
                    "success": True,
                    "data": {
                        "chunks": results
                    }
                }
            except Exception as e:
                logger.warning(
                    f"Semantic search failed: {str(e)}. Falling back to Phase 1 raw text behavior.",
                    correlation_id=correlation_id
                )
                
        # Phase 1 fallback behavior
        doc = await query_document(request.application_id, request.query)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "DOCUMENT_NOT_FOUND", "message": f"Document not found for application_id: {request.application_id}"}
            )
        return {
            "success": True,
            "data": doc
        }
    finally:
        correlation_id_var.reset(token)

@router.post("/index-jd")
async def index_jd_endpoint(
    request: IndexJDRequest,
    x_correlation_id: str | None = Header(None)
):
    correlation_id = x_correlation_id or "unknown"
    token = correlation_id_var.set(correlation_id)
    try:
        logger.info(
            f"Index JD request received", 
            job_id=request.job_id, 
            correlation_id=correlation_id
        )
        raw_text = f"Title: {request.title}\nDescription: {request.description}\nRequirements: {request.requirements}"
        
        from app.pipeline.embedding_pipeline import run_embedding_pipeline
        chunk_count = await run_embedding_pipeline(
            application_id=request.job_id,
            raw_text=raw_text,
            doc_type="JD",
            correlation_id=correlation_id
        )
        return {
            "success": True,
            "data": {
                "job_id": request.job_id,
                "chunk_count": chunk_count,
                "status": "SUCCESS"
            }
        }
    except Exception as e:
        logger.error(f"Index JD failed: {str(e)}", correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INDEX_JD_FAILED", "message": str(e)}
        )
    finally:
        correlation_id_var.reset(token)

@router.get("/{application_id}/status")
async def get_status_endpoint(
    application_id: str,
    x_correlation_id: str | None = Header(None)
):
    correlation_id = x_correlation_id or "unknown"
    token = correlation_id_var.set(correlation_id)
    try:
        logger.info(
            f"Status check request received for application {application_id}", 
            application_id=application_id,
            correlation_id=correlation_id
        )
        doc_status = await get_status(application_id)
        if not doc_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "DOCUMENT_NOT_FOUND", "message": f"Document not found for application_id: {application_id}"}
            )
        return {
            "success": True,
            "data": doc_status
        }
    finally:
        correlation_id_var.reset(token)

@router.post("/{application_id}/analyze")
async def analyze_cv_endpoint(
    application_id: str,
    request: AnalyzeRequest,
    x_correlation_id: str | None = Header(None),
):
    correlation_id = x_correlation_id or "unknown"
    token = correlation_id_var.set(correlation_id)
    try:
        logger.info(
            "CV analysis request received",
            application_id=application_id,
            job_title=request.job_title,
            correlation_id=correlation_id,
        )
        result = await analyze_cv(
            application_id=application_id,
            job_title=request.job_title,
            job_requirements=request.job_requirements,
        )
        return {
            "success": True,
            "data": result,
        }
    except DocumentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "DOCUMENT_NOT_FOUND",
                "message": f"No CV document found for application_id: {application_id}",
            },
        )
    except Exception as e:
        logger.error(
            f"CV analysis failed: {str(e)}",
            application_id=application_id,
            correlation_id=correlation_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "ANALYSIS_FAILED", "message": str(e)},
        )
    finally:
        correlation_id_var.reset(token)

