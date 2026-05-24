import pytest
from fastapi import status
from app.database import get_db_context

@pytest.mark.asyncio
async def test_health_endpoint(client, mocker):
    response = await client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "healthy"
    assert data["data"]["db"] == "connected"
    assert data["data"]["rabbitmq"] == "connected"

@pytest.mark.asyncio
async def test_parse_endpoint_success(client, mocker):
    mocker.patch(
        "app.services.document_service.extract_text_from_pdf",
        return_value=("Nguyễn Văn A\nEmail: nguyen@example.com", 1)
    )
    mocker.patch("os.path.exists", return_value=True)
    
    payload = {
        "application_id": "app-api-123",
        "cv_file_path": "/storage/cv/dummy.pdf"
    }
    
    response = await client.post("/internal/documents/parse", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert data["data"]["extracted_name"] == "Nguyễn Văn A"
    assert data["data"]["extracted_email"] == "nguyen@example.com"

@pytest.mark.asyncio
async def test_query_endpoint_not_found(client):
    payload = {
        "application_id": "nonexistent"
    }
    response = await client.post("/internal/documents/query", json=payload)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "DOCUMENT_NOT_FOUND"

@pytest.mark.asyncio
async def test_query_endpoint_success(client, mocker):
    async with get_db_context() as db:
        await db.execute(
            "INSERT INTO documents (id, application_id, type, raw_text, status) VALUES ('1', 'app-found', 'CV', 'Some raw CV content', 'SUCCESS')"
        )
        await db.commit()
        
    payload = {
        "application_id": "app-found"
    }
    response = await client.post("/internal/documents/query", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert data["data"]["raw_text"] == "Some raw CV content"

@pytest.mark.asyncio
async def test_status_endpoint_not_found(client):
    response = await client.get("/internal/documents/nonexistent/status")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "DOCUMENT_NOT_FOUND"

@pytest.mark.asyncio
async def test_status_endpoint_success(client, mocker):
    async with get_db_context() as db:
        await db.execute(
            "INSERT INTO documents (id, application_id, type, status, chunk_count, processed_at) VALUES ('1', 'app-status', 'CV', 'SUCCESS', 2, '2026-05-20T20:00:00')"
        )
        await db.commit()
        
    response = await client.get("/internal/documents/app-status/status")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "SUCCESS"
    assert data["data"]["chunk_count"] == 2
