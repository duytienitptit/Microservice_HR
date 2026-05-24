# AI Interviewer Service

## Tech Stack

| | |
|---|---|
| **Runtime** | Python 3.11+ |
| **Framework** | FastAPI + Pydantic v2 |
| **ORM** | SQLAlchemy |
| **Database** | PostgreSQL (`ai_db`) |
| **Test** | Pytest + httpx (AsyncClient) |
| **Logging** | Loguru |
| **Port** | 3002 |

## Responsibilities

- Create and manage `InterviewSession` lifecycle
- Provide Chat API for candidate interaction
- Call RAG Service (internal HTTP) to retrieve CV/JD context before generating questions
- Navigate interview flow through stages:

```
GREETING → EXPERIENCE_REVIEW → TECHNICAL_QUESTIONS → SCENARIO_QUESTIONS → CLOSING
```

- **Phase 1:** Return static/template questions per stage. No LLM integration.
- **Phase 2 (future):** LangGraph state machine; each node calls LLM with RAG context.
- **Publishes:** `INTERVIEW_COMPLETED_EVENT` with full chat history when session ends

## Database Tables

- `interview_sessions` — application_id, status, current_stage, started_at, ended_at
- `chat_messages` — session_id, role (AI | CANDIDATE), content, stage, created_at

## API Routes

| Prefix | Module |
|---|---|
| `/api/interviews/start` | Create new interview session |
| `/api/interviews/:sessionId` | Session info + current stage |
| `/api/interviews/:sessionId/chat` | Send message, receive AI response |
| `/api/interviews/:sessionId/history` | Full chat transcript |
| `/api/interviews/:sessionId/end` | End session, trigger assessment |

## Key Rules

- Session can only start for applications in `READY_FOR_INTERVIEW` status
- Chat history MUST be persisted in database, not in memory
- Session auto-progresses through 5 stages
- When RAG Service is unavailable, use fallback generic questions (Circuit Breaker)
- Circuit Breaker: Open after ≥3 failures in 60s, half-open after 30s timeout
- Library: `pybreaker`
