import pytest
from app.services.document_service import process_cv, query_document, get_status

@pytest.mark.asyncio
async def test_process_cv_success(mocker, mock_rabbitmq):
    mocker.patch(
        "app.services.document_service.extract_text_from_pdf",
        return_value=("Nguyễn Văn A\nEmail: nguyen@example.com\nSoftware Engineer", 3)
    )
    mocker.patch("os.path.exists", return_value=True)
    
    result = await process_cv("app-123", "/storage/cv/test.pdf", "corr-456")
    
    assert result["status"] == "SUCCESS"
    assert result["extracted_email"] == "nguyen@example.com"
    assert result["extracted_name"] == "Nguyễn Văn A"
    
    doc_status = await get_status("app-123")
    assert doc_status is not None
    assert doc_status["status"] == "SUCCESS"
    assert doc_status["chunk_count"] == 3
    
    doc_query = await query_document("app-123")
    assert doc_query is not None
    assert "Nguyễn Văn A" in doc_query["raw_text"]

@pytest.mark.asyncio
async def test_process_cv_retry_flow_success(mocker, mock_rabbitmq):
    mock_parser = mocker.patch("app.services.document_service.extract_text_from_pdf")
    mock_parser.side_effect = [
        Exception("Temp error 1"),
        Exception("Temp error 2"),
        ("Nguyễn Văn A\nEmail: nguyen@example.com", 2)
    ]
    mock_sleep = mocker.patch("asyncio.sleep", return_value=None)
    mocker.patch("os.path.exists", return_value=True)
    
    result = await process_cv("app-456", "/storage/cv/test.pdf", "corr-789")
    
    assert result["status"] == "SUCCESS"
    assert mock_sleep.call_count == 2
    
    doc_status = await get_status("app-456")
    assert doc_status["status"] == "SUCCESS"

@pytest.mark.asyncio
async def test_process_cv_all_attempts_fail(mocker, mock_rabbitmq):
    mock_parser = mocker.patch("app.services.document_service.extract_text_from_pdf")
    mock_parser.side_effect = Exception("Permanent error")
    mock_sleep = mocker.patch("asyncio.sleep", return_value=None)
    mocker.patch("os.path.exists", return_value=True)
    
    result = await process_cv("app-fail", "/storage/cv/test.pdf", "corr-fail")
    
    assert result["status"] == "FAILED"
    assert mock_sleep.call_count == 2
    
    doc_status = await get_status("app-fail")
    assert doc_status["status"] == "FAILED"
