# STEP 03 — RAG Service: Document Processing

## Trạng thái: ⬜ TODO

## Mục tiêu
Xây dựng RAG Service từ stub: nhận event CV_UPLOADED, trích xuất text từ PDF, trích xuất email/tên ứng viên bằng regex, publish CV_READY event. Cung cấp HTTP API nội bộ cho AI Service.

## Context — Đọc trước khi code

| Tài liệu | Mục đích | Đường dẫn |
|-----------|----------|-----------|
| PRD — US-6 | CV Processing acceptance criteria | [PRD.md](../PRD.md) § US-6 |
| System Design — §3.3 | RAG Service responsibilities + SQLite schema | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 3.3 |
| System Design — §4.7 | Internal APIs: /internal/documents/* | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 4.7 |
| System Design — §5 Luồng 1 | CV Upload → Processing pipeline | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 5 Luồng 1 |
| Event Contracts | CV_UPLOADED (consume) + CV_READY (publish) payloads | [event-contracts.md](../../.agents/rules/event-contracts.md) |
| Architecture | RAG = internal only, SQLite + Qdrant | [architecture.md](../../.agents/rules/architecture.md) |
| Code Standards | Python file structure, Loguru, Pydantic | [code-standards.md](../../.agents/rules/code-standards.md) |
| Workflow | Phase 1: raw text only, no embeddings | [workflow.md](../../.agents/rules/workflow.md) |
| RAG Service GEMINI | Service-specific context | [GEMINI.md](../../rag-service/GEMINI.md) |
| RabbitMQ Skill | Consumer/publisher patterns (Python) | [SKILL.md](../../.agents/skills/rabbitmq-integration/SKILL.md) |
| Docker Infra | Port mapping, health checks | [docker-infra.md](../../.agents/rules/docker-infra.md) |

## Prerequisite
- ✅ STEP-02 (Application Module) phải hoàn thành — cần publisher CV_UPLOADED hoạt động

## Tasks

### 3.1 — Project Setup
- [ ] Cập nhật `requirements.txt` — thêm: `pdfplumber`, `aio-pika`, `pydantic`, `loguru`, `python-dotenv`
- [ ] Tạo cấu trúc thư mục:
  ```
  app/
  ├── main.py          (cập nhật)
  ├── config.py        (env vars)
  ├── models/          (Pydantic schemas + SQLite)
  ├── routers/         (HTTP endpoints)
  ├── services/        (business logic)
  ├── pipeline/        (PDF parsing)
  ├── events/          (RabbitMQ pub/sub)
  └── database.py      (SQLite connection)
  ```

### 3.2 — SQLite Database
- [ ] Tạo `app/database.py` — SQLite connection + table creation
- [ ] Tạo bảng `documents` (id, application_id, type, raw_text, status, chunk_count, processed_at)

### 3.3 — PDF Processing Pipeline
- [ ] Tạo `app/pipeline/pdf_parser.py`
  - Extract raw text từ PDF bằng `pdfplumber`
  - Error handling cho corrupted/empty PDFs
- [ ] Tạo `app/pipeline/info_extractor.py`
  - Regex patterns để trích xuất email từ CV text
  - Regex patterns để trích xuất tên ứng viên
  - Return `None` nếu không tìm thấy (graceful failure)

### 3.4 — RabbitMQ Consumer + Publisher
- [ ] Tạo `app/events/connection.py` — RabbitMQ connection manager với retry
- [ ] Tạo `app/events/cv_uploaded_consumer.py`
  - Consume từ queue `cv.uploaded`
  - Download PDF → parse → extract info → save to SQLite → publish CV_READY
- [ ] Tạo `app/events/cv_ready_publisher.py`
  - Publish CV_READY_EVENT với status, chunk_count, extracted_email, extracted_name

### 3.5 — Internal HTTP APIs
- [ ] Tạo `app/routers/documents.py`
  - `POST /internal/documents/parse` — manual parse trigger
  - `POST /internal/documents/query` — Phase 1: return raw text (no vector search)
  - `GET /internal/documents/{application_id}/status` — check processing status

### 3.6 — Service Layer
- [ ] Tạo `app/services/document_service.py`
  - `process_cv(application_id, cv_file_path)` — orchestrate pipeline
  - `query_document(application_id, query)` — Phase 1: return raw text
  - `get_status(application_id)` — return document processing status

### 3.7 — Update main.py
- [ ] Cập nhật `app/main.py`
  - Include routers
  - Start RabbitMQ consumer on startup
  - Structured logging với Loguru
  - Health check cải tiến (check SQLite + RabbitMQ connection)

### 3.8 — Unit Tests
- [ ] Tạo `tests/test_pdf_parser.py` — test PDF text extraction
- [ ] Tạo `tests/test_info_extractor.py` — test email/name regex patterns
- [ ] Tạo `tests/test_document_service.py` — test processing pipeline (mock PDF + MQ)

### 3.9 — Verify
- [ ] Chạy test suite (`pytest`) — tất cả pass
- [ ] Update Dockerfile nếu cần (dependencies mới)

---

## Khi hoàn thành bước này
1. Đánh dấu tất cả tasks ở trên thành `[x]`
2. Cập nhật trạng thái đầu file: `## Trạng thái: ✅ DONE`
3. Cập nhật [TASK.md](../TASK.md): STEP-03 → `✅ DONE`, STEP-04 → `🔄 NEXT`
