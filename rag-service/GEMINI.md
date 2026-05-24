# RAG & Document Service

## Tech Stack

| | |
|---|---|
| **Runtime** | Python 3.11+ |
| **Framework** | FastAPI + Pydantic v2 |
| **Database** | SQLite (document metadata) + Qdrant (vector store) |
| **ORM/Driver** | Raw SQL (SQLite) + Qdrant client |
| **Test** | Pytest + httpx (AsyncClient) |
| **Logging** | Loguru |
| **Port** | 3003 |

## CRITICAL: Internal Service Only

This service is **NOT exposed** through the API Gateway. It receives traffic ONLY from:
- RabbitMQ events (CV_UPLOADED_EVENT)
- Internal HTTP calls from AI Service

## Responsibilities

- **Consumes:** `CV_UPLOADED_EVENT` → download PDF → extract text → store
- **Publishes:** `CV_READY_EVENT` with status `success` or `failed`
- Provide internal HTTP API for AI Service to query document content

### Phase 1 (Current)
- Raw text extraction only (pdfplumber)
- No embeddings, no vector search
- `/internal/documents/query` returns raw text chunks

### Phase 2 (Future)
- Full embedding pipeline + Qdrant semantic search
- RecursiveCharacterTextSplitter (512 tokens, 50 overlap)
- Embedding model: OpenAI or sentence-transformers

## Database: SQLite

```sql
CREATE TABLE documents (
  id              TEXT PRIMARY KEY,
  application_id  TEXT NOT NULL,
  type            TEXT CHECK (type IN ('CV', 'JD')),
  raw_text        TEXT,
  status          TEXT DEFAULT 'PENDING',
  chunk_count     INTEGER,
  processed_at    DATETIME
);
```

## Internal API Routes (no gateway prefix)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/internal/documents/parse` | Parse PDF, return raw text |
| `POST` | `/internal/documents/query` | Search documents (Phase 1: return raw text) |
| `GET` | `/internal/documents/:applicationId/status` | Check processing status |

## Key Rules

- PDF extraction library: `pdfplumber` (Phase 1)
- Handle corrupt/unreadable PDFs gracefully — publish `CV_READY_EVENT` with `status: "failed"`
- Retry PDF parsing up to 2 times with fixed 10s delay before marking as failed
