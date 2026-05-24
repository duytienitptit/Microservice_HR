# GEMINI.md — AI HR Recruiter

AI HR Recruiter is an intelligent recruitment platform built on microservice architecture. It automates first-round interviews: candidates submit CVs, an AI agent conducts structured interviews based on CV content and Job Descriptions, then generates scored assessment reports for HR.

## Before You Start

**Read these first — they define what to build and where we are:**

- Current progress & phase: `docs/TASK.md`
- Product requirements & user stories: `docs/PRD.md`
- Full system design: `docs/ai_hr_recruiter_design.md`

## Architecture Quick Reference

```
Client → API Gateway (Nginx:80) → Services
                                    ├── Core Service       (Node.js/Express/TS :3001, PostgreSQL)
                                    ├── AI Service         (Python/FastAPI     :3002, PostgreSQL)
                                    ├── RAG Service        (Python/FastAPI     :3003, Qdrant+SQLite)
                                    └── Assessment Service (Node.js/Express/TS :3004, MongoDB)

Async communication → RabbitMQ (4 events: CV_UPLOADED, CV_READY, INTERVIEW_COMPLETED, SEND_EMAIL)
```

## Rules — Auto-loaded

@./.agents/rules/architecture.md
@./.agents/rules/code-standards.md
@./.agents/rules/event-contracts.md
@./.agents/rules/workflow.md
@./.agents/rules/docker-infra.md

## When to Apply Which Rule

| Rule File | When to Read |
|---|---|
| `architecture.md` | **Always.** Immutable constraints — never violate. |
| `code-standards.md` | **Always.** Response envelope, logging, file structure. |
| `workflow.md` | When starting any task — check phase, behavioral rules, git conventions. |
| `event-contracts.md` | When coding RabbitMQ publishers/consumers — payload shapes, queue names. |
| `docker-infra.md` | When modifying Docker, docker-compose, or infrastructure config. |

## Service-Specific Context

Each service folder contains its own `GEMINI.md` with tech stack, responsibilities, schemas, and service-specific rules. Read the relevant one when working on a specific service:

- `core-service/GEMINI.md` — Auth, Jobs, Applications (Node.js/TypeScript)
- `ai-service/GEMINI.md` — Interview sessions, Chat (Python/FastAPI)
- `rag-service/GEMINI.md` — Document processing, PDF extraction (Python/FastAPI)
- `assessment-service/GEMINI.md` — Scoring, Reports, Email (Node.js/TypeScript)
