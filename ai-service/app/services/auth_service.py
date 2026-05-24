import httpx
from fastapi import HTTPException
from app.config import settings
from app.utils.logger import logger


async def validate_magic_token(token: str, correlation_id: str = "") -> dict:
    """
    Validates a magic link token by calling the Core Service internal API.

    Calls: POST {CORE_SERVICE_URL}/api/internal/validate-token
    - If valid: returns { application_id, job_id, candidate_name, job_title }
    - If invalid/used/wrong-status: raises HTTPException with appropriate status code
    - If Core Service unreachable: raises HTTPException 502
    """
    url = f"{settings.CORE_SERVICE_URL}/api/internal/validate-token"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                url,
                json={"token": token},
                headers={"X-Correlation-ID": correlation_id},
            )

        if response.status_code == 200:
            body = response.json()
            if body.get("success"):
                logger.info(
                    "Magic token validated successfully",
                    correlation_id=correlation_id,
                    application_id=body["data"].get("application_id"),
                )
                return body["data"]

        # Handle error responses from Core Service
        body = response.json()
        error_msg = body.get("error", {}).get("message", "Token validation failed")
        error_code = body.get("error", {}).get("code", "TOKEN_VALIDATION_FAILED")

        logger.warning(
            f"Token validation failed: {error_code}",
            correlation_id=correlation_id,
            status_code=response.status_code,
        )

        raise HTTPException(
            status_code=response.status_code,
            detail={"code": error_code, "message": error_msg},
        )

    except httpx.RequestError as exc:
        logger.error(
            f"Core Service unreachable: {str(exc)}",
            correlation_id=correlation_id,
        )
        raise HTTPException(
            status_code=502,
            detail={
                "code": "CORE_SERVICE_UNAVAILABLE",
                "message": "Unable to reach Core Service for token validation.",
            },
        )
