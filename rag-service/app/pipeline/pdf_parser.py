import os
import pdfplumber
from app.utils.logger import logger

def extract_text_from_pdf(file_path: str) -> tuple[str, int]:
    """
    Extracts all text from a PDF file using pdfplumber.
    Returns:
        tuple[str, int]: (extracted_text, page_count)
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found at path: {file_path}")
        
    try:
        with pdfplumber.open(file_path) as pdf:
            pages_text = []
            page_count = len(pdf.pages)
            if page_count == 0:
                raise ValueError("PDF file is empty (contains no pages)")
                
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    pages_text.append(text)
                else:
                    logger.warning(f"Could not extract text from page {page_num + 1} of {file_path}")
            
            full_text = "\n\n".join(pages_text)
            
            # If after reading all pages, there's absolutely no text extracted, raise an error
            if not full_text.strip():
                raise ValueError("Could not extract any readable text from the PDF file")
                
            return full_text, page_count
            
    except Exception as e:
        logger.error(f"Error occurred while parsing PDF: {str(e)}", file_path=file_path)
        raise
