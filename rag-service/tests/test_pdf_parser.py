import pytest
from unittest.mock import MagicMock
from app.pipeline.pdf_parser import extract_text_from_pdf

def test_extract_text_file_not_found():
    with pytest.raises(FileNotFoundError):
        extract_text_from_pdf("nonexistent.pdf")

def test_extract_text_success(mocker):
    mocker.patch("os.path.exists", return_value=True)
    
    # Mock pdfplumber.open context manager
    mock_pdf = MagicMock()
    mock_pdf.__enter__.return_value = mock_pdf
    
    mock_page1 = MagicMock()
    mock_page1.extract_text.return_value = "Page 1 content"
    mock_page2 = MagicMock()
    mock_page2.extract_text.return_value = "Page 2 content"
    
    mock_pdf.pages = [mock_page1, mock_page2]
    mocker.patch("pdfplumber.open", return_value=mock_pdf)
    
    text, pages = extract_text_from_pdf("dummy.pdf")
    assert text == "Page 1 content\n\nPage 2 content"
    assert pages == 2

def test_extract_text_empty_pdf(mocker):
    mocker.patch("os.path.exists", return_value=True)
    
    mock_pdf = MagicMock()
    mock_pdf.__enter__.return_value = mock_pdf
    mock_pdf.pages = []
    mocker.patch("pdfplumber.open", return_value=mock_pdf)
    
    with pytest.raises(ValueError, match="empty"):
        extract_text_from_pdf("dummy.pdf")

def test_extract_text_no_readable_text(mocker):
    mocker.patch("os.path.exists", return_value=True)
    
    mock_pdf = MagicMock()
    mock_pdf.__enter__.return_value = mock_pdf
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "   "
    mock_pdf.pages = [mock_page]
    mocker.patch("pdfplumber.open", return_value=mock_pdf)
    
    with pytest.raises(ValueError, match="readable text"):
        extract_text_from_pdf("dummy.pdf")
