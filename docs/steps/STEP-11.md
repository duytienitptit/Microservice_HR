# STEP 11 — RAG Service: Embedding Pipeline + Qdrant Vector Search

## Trạng thái: ✅ DONE

## Mục tiêu
Nâng cấp RAG Service từ raw text extraction (Phase 1) sang full embedding pipeline: text chunking → vector embeddings → lưu trữ trong Qdrant → semantic search API. Bổ sung JD document processing để embed cả Job Description.

## Context — Đọc trước khi code

| Tài liệu | Mục đích | Đường dẫn |
|-----------|----------|-----------|
| System Design — §3.3 | RAG Service responsibilities, embedding pipeline | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 3.3 |
| System Design — §5 Luồng 1 | CV Upload → Processing flow | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 5 Luồng 1 |
| System Design — §4.7 | Internal APIs: /internal/documents/* | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 4.7 |
| PRD — Phase 2 | Embedding pipeline + semantic search | [PRD.md](../PRD.md) § Phase 2 |
| Architecture | Service boundaries, RAG = internal only | [architecture.md](../../.agents/rules/architecture.md) |
| Event Contracts | CV_UPLOADED, CV_READY payloads | [event-contracts.md](../../.agents/rules/event-contracts.md) |
| RAG Service GEMINI | Service-specific context | [GEMINI.md](../../rag-service/GEMINI.md) |
| Docker Infra | Qdrant container config | [docker-infra.md](../../.agents/rules/docker-infra.md) |

## Prerequisite
- ✅ STEP-10 (Frontend Complete) phải hoàn thành trước
- ✅ Phase 1 RAG Service (raw text extraction) đang hoạt động
- ✅ Qdrant container đã chạy trong Docker Compose

## Tasks

### 11.1 — Install Embedding Dependencies
- [x] Thêm vào `requirements.txt`:
  - `langchain` — text splitting utilities
  - `langchain-community` — vector store integrations
  - `sentence-transformers` — local embedding model (hoặc `openai` cho OpenAI embeddings)
  - `qdrant-client` — Qdrant Python SDK
- [x] Verify: `pip install` thành công trong Docker container

### 11.2 — Text Splitter Module
- [x] Tạo `app/pipeline/text_splitter.py`
  - Sử dụng `RecursiveCharacterTextSplitter` từ LangChain
  - Config: chunk_size=512 tokens, chunk_overlap=50 tokens
  - Input: raw text → Output: list of text chunks
  - Preserve metadata per chunk (source, page_number, chunk_index)

### 11.3 — Embedding Module
- [x] Tạo `app/pipeline/embedder.py`
  - Abstract interface `BaseEmbedder` (dễ swap provider)
  - Implementation: `SentenceTransformerEmbedder` (local, free)
  - Optional: `OpenAIEmbedder` (nếu dùng OpenAI API)
  - Input: list of text chunks → Output: list of vector embeddings
  - Batch processing cho hiệu suất

### 11.4 — Qdrant Vector Store Integration
- [x] Tạo `app/vector_store/qdrant_store.py`
  - Connect tới Qdrant container (`QDRANT_URL` env var)
  - Create collection `documents` (nếu chưa tồn tại)
  - `upsert_vectors(application_id, chunks, embeddings)` — lưu vectors
  - `search(query_text, application_id, top_k=5)` — similarity search
  - `delete_by_application(application_id)` — cleanup
  - Vector dimension: phù hợp với embedding model (384 cho sentence-transformers, 1536 cho OpenAI)

### 11.5 — Full Embedding Pipeline
- [x] Tạo `app/pipeline/embedding_pipeline.py`
  - Orchestrate: raw_text → split → embed → store in Qdrant
  - Input: `application_id`, `raw_text`, `doc_type` (CV/JD)
  - Update SQLite `documents` table: `chunk_count`, `status`, `processed_at`
  - Error handling: nếu embedding fails, vẫn giữ raw text (fallback)

### 11.6 — Update CV_UPLOADED Consumer
- [x] Cập nhật `app/events/consumers/cv_uploaded_consumer.py`
  - Sau khi extract text (Phase 1 logic giữ nguyên)
  - Thêm bước: gọi embedding pipeline
  - CV_READY_EVENT payload thêm `chunk_count`
  - Fallback: nếu embedding fails, vẫn publish CV_READY với raw text (Phase 1 behavior)

### 11.7 — JD Document Processing
- [x] Tạo endpoint `POST /internal/documents/index-jd`
  - Input: `{ job_id, title, description, requirements }`
  - Combine title + description + requirements thành single document
  - Run embedding pipeline với doc_type = 'JD'
  - AI Service gọi endpoint này khi bắt đầu interview (nếu JD chưa indexed)

### 11.8 — Semantic Search API
- [x] Cập nhật `POST /internal/documents/query`
  - Input: `{ query_text, application_id, top_k }`
  - Embed query text → search Qdrant → return top_k relevant chunks
  - Response: `{ chunks: [{ content, score, metadata }] }`
  - Fallback: nếu Qdrant unavailable, return raw text (Phase 1 behavior)
- [x] Cập nhật `GET /internal/documents/:applicationId/status`
  - Thêm thông tin: `has_embeddings`, `chunk_count`, `embedding_model`

### 11.9 — Unit Tests
- [x] Test text splitter (chunk size, overlap)
- [x] Test embedding module (mock model)
- [x] Test Qdrant store (upsert, search, delete)
- [x] Test full pipeline (end-to-end with mocks)
- [x] Test fallback behavior (embedding fails → raw text works)

### 11.10 — Integration Tests
- [x] Test CV upload → embedding → Qdrant storage (with real Qdrant)
- [x] Test semantic search returns relevant results
- [x] Test JD indexing endpoint
- [x] Test backward compatibility (Phase 1 consumers still work)

### 11.11 — Verify
- [x] Chạy toàn bộ test suite — tất cả pass
- [x] Upload CV → embeddings được tạo trong Qdrant
- [x] Semantic search trả về chunks liên quan
- [x] Phase 1 fallback hoạt động khi embedding fails
- [x] Qdrant data persist qua Docker restart

---

## Khi hoàn thành bước này
1. Đánh dấu tất cả tasks ở trên thành `[x]`
2. Cập nhật trạng thái đầu file: `## Trạng thái: ✅ DONE`
3. Cập nhật [TASK.md](../TASK.md): STEP-11 → `✅ DONE`, STEP-12 → `🔄 NEXT`
