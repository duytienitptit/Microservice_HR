import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
from fastapi import HTTPException

from app.services.auth_service import validate_magic_token


@pytest.mark.asyncio
async def test_validate_token_success():
    """Valid token should return application data."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "success": True,
        "data": {
            "application_id": "test-app-id",
            "job_id": "test-job-id",
            "candidate_name": "John Doe",
            "job_title": "Backend Engineer",
        },
    }

    with patch("app.services.auth_service.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await validate_magic_token("valid-token", "test-corr-id")

        assert result["application_id"] == "test-app-id"
        assert result["job_id"] == "test-job-id"
        assert result["candidate_name"] == "John Doe"
        assert result["job_title"] == "Backend Engineer"


@pytest.mark.asyncio
async def test_validate_token_not_found():
    """Invalid token should raise HTTPException 404."""
    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_response.json.return_value = {
        "success": False,
        "error": {
            "code": "TOKEN_NOT_FOUND",
            "message": "Magic link token is invalid.",
        },
    }

    with patch("app.services.auth_service.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        with pytest.raises(HTTPException) as exc_info:
            await validate_magic_token("invalid-token", "test-corr-id")
        assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_validate_token_already_used():
    """Used token should raise HTTPException 403."""
    mock_response = MagicMock()
    mock_response.status_code = 403
    mock_response.json.return_value = {
        "success": False,
        "error": {
            "code": "TOKEN_ALREADY_USED",
            "message": "This magic link has already been used.",
        },
    }

    with patch("app.services.auth_service.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        with pytest.raises(HTTPException) as exc_info:
            await validate_magic_token("used-token", "test-corr-id")
        assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_validate_token_core_service_unavailable():
    """Core Service unreachable should raise HTTPException 502."""
    with patch("app.services.auth_service.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.post.side_effect = httpx.ConnectError("Connection refused")
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        with pytest.raises(HTTPException) as exc_info:
            await validate_magic_token("any-token", "test-corr-id")
        assert exc_info.value.status_code == 502
