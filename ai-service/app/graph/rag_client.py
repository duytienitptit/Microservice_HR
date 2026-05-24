import pybreaker
import httpx
from app.config import settings
from app.utils.logger import logger

# Circuit Breakers: 3 failures in 60s -> open, reset_timeout=30s
rag_breaker = pybreaker.CircuitBreaker(
    fail_max=3,
    reset_timeout=30.0,
)

core_breaker = pybreaker.CircuitBreaker(
    fail_max=3,
    reset_timeout=30.0,
)

async def get_cv_context(application_id: str, query: str = "", correlation_id: str = "") -> str:
    """
    Retrieves CV context for the candidate's application.
    If STEP-11 Qdrant is down or not implemented, falls back to raw text.
    """
    url = f"{settings.RAG_SERVICE_URL}/internal/documents/query"
    try:
        with rag_breaker.calling():
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    url,
                    json={"application_id": application_id, "query": query},
                    headers={"X-Correlation-ID": correlation_id}
                )
                response.raise_for_status()
                result = response.json()
                if result.get("success") and result.get("data"):
                    return result["data"].get("raw_text") or ""
                return ""
    except Exception as e:
        logger.warning(
            f"RAG Service CV query failed (Breaker state: {rag_breaker.current_state}). "
            f"Error: {str(e)}",
            correlation_id=correlation_id
        )
        return ""

async def get_jd_context(application_id: str, correlation_id: str = "") -> str:
    """
    Retrieves Job Description context from the Core Service internal API.
    """
    url = f"{settings.CORE_SERVICE_URL}/api/internal/applications/{application_id}"
    try:
        with core_breaker.calling():
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    url,
                    headers={"X-Correlation-ID": correlation_id}
                )
                response.raise_for_status()
                result = response.json()
                if result.get("success") and result.get("data"):
                    app_data = result["data"].get("application") or {}
                    job_data = app_data.get("job") or {}
                    title = job_data.get("title") or ""
                    desc = job_data.get("description") or ""
                    reqs = job_data.get("requirements") or ""
                    return f"Job Title: {title}\nDescription: {desc}\nRequirements: {reqs}"
                return ""
    except Exception as e:
        logger.warning(
            f"Core Service Application/JD query failed (Breaker state: {core_breaker.current_state}). "
            f"Error: {str(e)}",
            correlation_id=correlation_id
        )
        return ""

async def get_application_info(application_id: str, correlation_id: str = "") -> dict:
    """
    Fetches basic application metadata (candidate name, job title, job ID) from Core Service.
    """
    url = f"{settings.CORE_SERVICE_URL}/api/internal/applications/{application_id}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                url,
                headers={"X-Correlation-ID": correlation_id}
            )
            if response.status_code == 200:
                body = response.json()
                if body.get("success") and body.get("data"):
                    app_data = body["data"].get("application") or {}
                    job_data = app_data.get("job") or {}
                    return {
                        "candidate_name": app_data.get("candidateName") or "Candidate",
                        "job_title": job_data.get("title") or "",
                        "job_id": app_data.get("jobId") or ""
                    }
    except Exception as e:
        logger.warning(f"Failed to fetch application details for {application_id}: {str(e)}", correlation_id=correlation_id)
    return {
        "candidate_name": "Ứng viên",
        "job_title": "Software Engineer",
        "job_id": ""
    }
