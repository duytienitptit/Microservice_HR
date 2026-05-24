# Workflow & Behavioral Rules

## Phase Control

### Phase 1 (Current) — Foundation

- **Mock AI responses.** Use static/templated interview questions. Do NOT integrate LLM.
- **Plain text extraction only.** RAG Service extracts raw PDF text. No embeddings, no vector search.
- **Rule-based scoring only.** Assessment Service scores via keyword matching and response length. No LLM.
- **No frontend.** API-only. Test via Postman collection.

### Phase 2 (Future) — AI Integration

- LangGraph state machine for interview flow
- Embedding pipeline + Qdrant semantic search
- LLM-powered scoring with reasoning

> **CRITICAL:** If current phase in `docs/TASK.md` says "Phase 1", do NOT implement Phase 2 features. Do NOT install LangChain, OpenAI SDK, or embedding libraries.

## Behavioral Rules — HOW TO WORK

1. **ALWAYS read `docs/TASK.md` before starting any work.** Know where we are.
2. **ALWAYS ask before changing database schemas.** Schema changes affect multiple flows.
3. **ALWAYS ask before installing new dependencies.** Explain why it's needed.
4. **ALWAYS write tests for business logic.** No untested code in `services/` layer.
5. **NEVER refactor or "clean up" code that is not related to the current task.**
6. **NEVER create files outside the established folder structure.**
7. **NEVER implement Phase 2 features during Phase 1.**
8. **Think before coding.** State your assumptions and approach before writing code.
9. **Surgical changes only.** Touch only what is necessary for the current task.
10. **One service at a time.** Complete and test a service before moving to the next.

## Git Conventions

- **Commit format:** `<type>: <short description>`
  - Types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`
  - Example: `feat: implement POST /api/auth/register`
- **Branch naming:** `feature/<service>-<feature>` (e.g., `feature/core-auth`)

## Application Status State Machine

```
SUBMITTED → CV_PROCESSING → READY_FOR_INTERVIEW → INVITED → IN_INTERVIEW → COMPLETED → ARCHIVED
                          ↘ CV_PARSE_FAILED
```

State transition triggers:
- `SUBMITTED → CV_PROCESSING`: Automatic when HR uploads CV (publishes CV_UPLOADED_EVENT)
- `CV_PROCESSING → READY_FOR_INTERVIEW`: CV_READY_EVENT received with status=success
- `CV_PROCESSING → CV_PARSE_FAILED`: CV_READY_EVENT received with status=failed
- `READY_FOR_INTERVIEW → INVITED`: HR clicks "Send Interview Invite" (generates magic link, sends email)
- `INVITED → IN_INTERVIEW`: Candidate clicks magic link and starts the interview session
- `IN_INTERVIEW → COMPLETED`: Interview session ends, INTERVIEW_COMPLETED_EVENT published
- `COMPLETED → ARCHIVED`: HR manually archives

Each transition is triggered by a specific event or API call. Do NOT allow skipping states.
