# STEP 12 — AI Service: LangGraph State Machine + LLM-Powered Questions

## Trạng thái: ✅ DONE

## Mục tiêu
Thay thế template questions (Phase 1) bằng LangGraph state machine. Mỗi interview stage là một graph node gọi LLM với RAG context (CV + JD), tạo câu hỏi dynamic dựa trên nội dung CV ứng viên và yêu cầu Job Description.

## Context — Đọc trước khi code

| Tài liệu | Mục đích | Đường dẫn |
|-----------|----------|-----------|
| System Design — §3.2 | AI Service responsibilities, interview stages | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 3.2 |
| System Design — §6.2 | Circuit Breaker (AI → RAG) | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 6.2 |
| PRD — Phase 2 | LangGraph + LLM integration | [PRD.md](../PRD.md) § Phase 2 |
| AI Service GEMINI | Service-specific context | [GEMINI.md](../../ai-service/GEMINI.md) |
| Architecture | Service boundaries | [architecture.md](../../.agents/rules/architecture.md) |
| Event Contracts | INTERVIEW_COMPLETED payload | [event-contracts.md](../../.agents/rules/event-contracts.md) |
| STEP-11 | RAG semantic search API đã sẵn sàng | [STEP-11.md](STEP-11.md) |

## Prerequisite
- ✅ STEP-11 (RAG Embedding Pipeline) phải hoàn thành trước
- ✅ RAG Service semantic search API hoạt động
- ✅ Phase 1 AI Service (template questions) đang hoạt động

## Tasks

### 12.1 — Install LangGraph + LLM Dependencies
- [ ] Thêm vào `requirements.txt`:
  - `langgraph` — state machine framework
  - `langchain-openai` hoặc `langchain-community` — LLM provider
  - `openai` — OpenAI SDK (hoặc provider SDK tương ứng)
- [ ] Configure `LLM_PROVIDER` và `LLM_API_KEY` env vars
- [ ] Verify: imports hoạt động trong Docker container

### 12.2 — Graph State Definition
- [ ] Tạo `app/graph/state.py`
  - Define `InterviewState` TypedDict:
    - `session_id`, `application_id`, `current_stage`
    - `chat_history`: list of messages
    - `cv_context`: extracted CV chunks from RAG
    - `jd_context`: extracted JD chunks from RAG
    - `candidate_message`: latest candidate input
    - `ai_response`: generated response
    - `stage_question_count`: track questions per stage
    - `should_transition`: flag to move to next stage

### 12.3 — RAG Context Retrieval
- [ ] Tạo `app/graph/rag_client.py`
  - `get_cv_context(application_id, query)` — call RAG Service semantic search
  - `get_jd_context(job_id, query)` — call RAG Service for JD content
  - Circuit breaker integration (pybreaker):
    - 3 failures in 60s → open
    - 30s timeout → half-open
    - Fallback: return empty context (use generic questions)
  - Timeout: 5s per request

### 12.4 — Graph Nodes (5 Stages)
- [ ] Tạo `app/graph/nodes/greeting.py`
  - Greeting node: introduce AI interviewer, explain process
  - Use candidate name + job title from context
  - 1 exchange → auto-transition to EXPERIENCE_REVIEW
- [ ] Tạo `app/graph/nodes/experience_review.py`
  - Query RAG: tìm kinh nghiệm từ CV
  - LLM prompt: hỏi về experience dựa trên CV content
  - 2-3 questions → transition to TECHNICAL_QUESTIONS
- [ ] Tạo `app/graph/nodes/technical_questions.py`
  - Query RAG: tìm skills từ CV + requirements từ JD
  - LLM prompt: câu hỏi kỹ thuật phù hợp với JD requirements
  - 3-4 questions → transition to SCENARIO_QUESTIONS
- [ ] Tạo `app/graph/nodes/scenario_questions.py`
  - Query RAG: tìm projects/achievements từ CV
  - LLM prompt: situational questions liên quan đến role
  - 2-3 questions → transition to CLOSING
- [ ] Tạo `app/graph/nodes/closing.py`
  - Thank candidate, summarize what was discussed
  - 1 exchange → mark session for completion

### 12.5 — Graph Builder + Router
- [ ] Tạo `app/graph/builder.py`
  - Build LangGraph `StateGraph` với 5 nodes
  - Define edges: stage transitions based on `should_transition`
  - Conditional routing: check `stage_question_count` to decide transition
  - Compile graph to runnable
- [ ] Tạo `app/graph/router.py`
  - `route_message(state)` → determine next node based on current stage + question count

### 12.6 — Prompt Templates
- [ ] Tạo `app/graph/prompts.py`
  - System prompt per stage
  - Include: role definition, interview guidelines, tone
  - Template variables: `{candidate_name}`, `{job_title}`, `{cv_context}`, `{jd_requirements}`, `{chat_history}`
  - Guidelines: professional but friendly, probe deeper on vague answers

### 12.7 — Update Interview Service
- [ ] Cập nhật `app/services/interview_service.py`
  - Replace template question engine với LangGraph invocation
  - `process_message(session_id, candidate_message)` → invoke graph → return AI response
  - Preserve backward compatibility: config flag `USE_LANGGRAPH=true/false`
  - Nếu `USE_LANGGRAPH=false`, fallback về Phase 1 template behavior

### 12.8 — Update Chat API
- [ ] Cập nhật `POST /api/interviews/:sessionId/chat`
  - Pass message through LangGraph pipeline
  - Store both candidate message + AI response in chat_messages table
  - Return: `{ ai_response, current_stage, is_complete }`

### 12.9 — Unit Tests
- [ ] Test graph state transitions (5 stages in correct order)
- [ ] Test each node individually (mock LLM + RAG)
- [ ] Test circuit breaker fallback (RAG unavailable → generic questions)
- [ ] Test backward compatibility flag
- [ ] Test prompt template rendering

### 12.10 — Integration Tests
- [ ] Test full interview flow: greeting → all stages → closing
- [ ] Test LLM generates context-aware questions (mock LLM with expected patterns)
- [ ] Test resume interview (existing session + chat history)
- [ ] Test concurrent sessions (multiple candidates)

### 12.11 — Verify
- [ ] Chạy toàn bộ test suite — tất cả pass
- [ ] Full interview flow với LangGraph tạo câu hỏi dynamic
- [ ] Circuit breaker hoạt động khi RAG down
- [ ] Phase 1 fallback hoạt động khi `USE_LANGGRAPH=false`
- [ ] Chat history persist đúng

---

## Khi hoàn thành bước này
1. Đánh dấu tất cả tasks ở trên thành `[x]`
2. Cập nhật trạng thái đầu file: `## Trạng thái: ✅ DONE`
3. Cập nhật [TASK.md](../TASK.md): STEP-12 → `✅ DONE`, STEP-13 → `🔄 NEXT`
