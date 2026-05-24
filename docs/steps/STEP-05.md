# STEP 05 — AI Service: Interview Session

## Trạng thái: ✅ DONE

## Mục tiêu
Xây dựng AI Service từ stub: quản lý phiên phỏng vấn (interview session), xác thực ứng viên qua magic link, cung cấp chat API với câu hỏi template theo từng stage, publish INTERVIEW_COMPLETED event khi kết thúc.

## Context — Đọc trước khi code

| Tài liệu | Mục đích | Đường dẫn |
|-----------|----------|-----------|
| PRD — Interview Session | Acceptance criteria | [PRD.md](../PRD.md) § Feature: Interview Session |
| PRD — US-8, US-9, US-10 | User stories: Start, Chat, End interview | [PRD.md](../PRD.md) § US-8, US-9, US-10 |
| System Design — §3.2 | AI Service responsibilities + DB schema | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 3.2 |
| System Design — §4.5 | Interview API endpoints | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 4.5 |
| System Design — §5 Luồng 2 | Interview → Assessment flow | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 5 Luồng 2 |
| Event Contracts | INTERVIEW_COMPLETED payload | [event-contracts.md](../../.agents/rules/event-contracts.md) |
| Architecture | AI Service = FastAPI :3002 | [architecture.md](../../.agents/rules/architecture.md) |
| Code Standards | Python file structure, Loguru, Pydantic | [code-standards.md](../../.agents/rules/code-standards.md) |
| Workflow | Phase 1: template questions, no LLM | [workflow.md](../../.agents/rules/workflow.md) |
| Workflow — State Machine | Interview stages | [workflow.md](../../.agents/rules/workflow.md) |
| AI Service GEMINI | Service-specific context | [GEMINI.md](../../ai-service/GEMINI.md) |
| RabbitMQ Skill | Publisher patterns (Python) | [SKILL.md](../../.agents/skills/rabbitmq-integration/SKILL.md) |

## Prerequisite
- ✅ STEP-04 (Checkpoint) phải pass — Core Service + RAG Service đang hoạt động

## Tasks

### 5.1 — Project Setup
- [x] Cập nhật `requirements.txt` — thêm: `sqlalchemy`, `asyncpg`, `psycopg2-binary`, `aio-pika`, `pydantic`, `loguru`, `python-dotenv`, `httpx`
- [x] Tạo cấu trúc thư mục:
  ```
  app/
  ├── main.py          (cập nhật)
  ├── config.py        (env vars)
  ├── database.py      (SQLAlchemy async setup)
  ├── models/          (SQLAlchemy models + Pydantic schemas)
  ├── routers/         (HTTP endpoints)
  ├── services/        (business logic)
  ├── events/          (RabbitMQ publisher)
  └── templates/       (static interview questions)
  ```

### 5.2 — Database Models (SQLAlchemy)
- [x] Tạo `app/database.py` — async SQLAlchemy engine cho `ai_db`
- [x] Tạo `app/models/interview_session.py` — InterviewSession model
  - id, application_id, status (PENDING/IN_PROGRESS/COMPLETED), current_stage, started_at, ended_at
- [x] Tạo `app/models/chat_message.py` — ChatMessage model
  - id, session_id, role (AI/CANDIDATE), content, stage, created_at
- [x] Auto-create tables on startup

### 5.3 — Template Questions
- [x] Tạo `app/templates/questions.py` — câu hỏi tĩnh cho mỗi stage:
  - `GREETING` — 1 câu chào + giới thiệu
  - `EXPERIENCE_REVIEW` — 2-3 câu về kinh nghiệm
  - `TECHNICAL_QUESTIONS` — 3-4 câu kỹ thuật (generic)
  - `SCENARIO_QUESTIONS` — 2-3 câu tình huống
  - `CLOSING` — 1 câu kết thúc + cảm ơn
- [x] Logic chuyển stage tự động dựa trên số câu trả lời

### 5.4 — Magic Link Validation
- [x] Tạo `app/services/auth_service.py`
  - `validate_magic_token(token)` — gọi HTTP tới Core Service để verify token
  - Return application_id nếu hợp lệ
  - Return 403 nếu token invalid hoặc is_link_used = TRUE

### 5.5 — Interview Service
- [x] Tạo `app/services/interview_service.py`
  - `start_session(application_id, token)` — tạo hoặc resume session
  - `process_message(session_id, message)` — nhận tin nhắn ứng viên, trả về câu hỏi tiếp theo
  - `end_session(session_id)` — kết thúc phiên, publish INTERVIEW_COMPLETED
  - `get_history(session_id)` — lấy lịch sử chat

### 5.6 — RabbitMQ Publisher
- [x] Tạo `app/events/connection.py` — RabbitMQ connection manager
- [x] Tạo `app/events/interview_publisher.py`
  - Publish INTERVIEW_COMPLETED_EVENT với session_id, application_id, chat_history

### 5.7 — HTTP Endpoints
- [x] Tạo `app/routers/interviews.py`
  - `GET /interview/{token}` — magic link entry point (start/resume session)
  - `GET /api/interviews/{session_id}` — session info
  - `POST /api/interviews/{session_id}/chat` — send message
  - `GET /api/interviews/{session_id}/history` — chat history
  - `POST /api/interviews/{session_id}/end` — end session

### 5.8 — Update main.py
- [x] Include routers
- [x] RabbitMQ publisher initialization
- [x] Structured logging (Loguru)
- [x] Health check (check DB + RabbitMQ)

### 5.9 — Unit Tests
- [x] Tạo `tests/test_interview_service.py`
  - Test start session
  - Test message processing + stage progression
  - Test end session
  - Test resume session
- [x] Tạo `tests/test_auth_service.py`
  - Test magic link validation (mock HTTP)

### 5.10 — Verify
- [x] Chạy test suite (`pytest`) — tất cả pass (15/15)
- [x] Update Dockerfile nếu cần

---

## Khi hoàn thành bước này
1. ✅ Đánh dấu tất cả tasks ở trên thành `[x]`
2. ✅ Cập nhật trạng thái đầu file: `## Trạng thái: ✅ DONE`
3. ✅ Cập nhật [TASK.md](../TASK.md): STEP-05 → `✅ DONE`, STEP-06 → `🔄 NEXT`
