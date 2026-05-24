from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.utils.logger import logger

def split_document(raw_text: str, source: str = "CV", chunk_size: int = 512, chunk_overlap: int = 50) -> list[dict]:
    """
    Splits document text into smaller chunks.
    For CVs, splits page-by-page by using the double newline boundary '\n\n'
    retained during PDF parsing, and tracks page numbers.
    For other documents, splits the entire block as a single context.
    
    Returns:
        list[dict]: A list of chunks, each structured as:
            {
                "content": str,
                "metadata": {
                    "source": str,
                    "page_number": int,
                    "chunk_index": int
                }
            }
    """
    logger.info(f"Splitting document text", source=source, raw_text_len=len(raw_text))
    
    # Initialize the character-based splitter
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len
    )
    
    chunks = []
    chunk_index = 0
    
    # Split the raw text by double newline to separate pages
    pages = raw_text.split("\n\n")
    
    for page_idx, page_text in enumerate(pages):
        page_num = page_idx + 1
        page_text = page_text.strip()
        if not page_text:
            continue
            
        page_chunks = splitter.split_text(page_text)
        for chunk_text in page_chunks:
            chunk_text = chunk_text.strip()
            if not chunk_text:
                continue
            
            chunks.append({
                "content": chunk_text,
                "metadata": {
                    "source": source,
                    "page_number": page_num,
                    "chunk_index": chunk_index
                }
            })
            chunk_index += 1
            
    logger.info(f"Split completed", source=source, total_chunks=len(chunks))
    return chunks
