# Architecture — IMMUTABLE CONSTRAINTS

## System Diagram

```
Client → API Gateway (Nginx:80) → Services
                                    ├── Core Service       (Node.js/Express/TS, port 3001, PostgreSQL)
                                    ├── AI Service         (Python/FastAPI, port 3002, PostgreSQL)
                                    ├── RAG Service        (Python/FastAPI, port 3003, Qdrant + SQLite)
                                    └── Assessment Service (Node.js/Express/TS, port 3004, MongoDB)

All async communication → RabbitMQ
```

## Constraints — NEVER violate

1. **4 services exactly.** Do NOT merge or split services.
2. **Message Queue: RabbitMQ only.** Do NOT switch to Kafka, Redis Pub/Sub, or any alternative.
3. **API Gateway: Nginx.** Do NOT replace with Express gateway, Kong, or Traefik.
4. **Each service owns its own database.** NEVER share a database between services.
5. **No direct imports between services.** Services communicate ONLY via HTTP or RabbitMQ.
6. **RAG Service is internal only.** It is NOT exposed through the API Gateway.

## Database Ownership (strict boundary)

| Service | Database | ORM/Driver |
|---|---|---|
| Core Service | PostgreSQL (`core_db`) | Prisma |
| AI Service | PostgreSQL (`ai_db`) | SQLAlchemy |
| RAG Service | SQLite (metadata) + Qdrant (vectors) | Raw SQL + Qdrant client |
| Assessment Service | MongoDB (`assessment_db`) | Mongoose |

> Core Service and AI Service use separate logical databases on the same PostgreSQL server. They MUST NOT access each other's tables.

## Tech Stack Rationale

| Choice | Why |
|---|---|
| **Express.js** | Minimal, unopinionated — full control over architecture. TypeScript strict mode enforces type safety. |
| **FastAPI** | Native async, automatic OpenAPI docs, Pydantic validation. Ideal for AI/ML workloads. |
| **Prisma** | Type-safe ORM with migration management. Best DX for TypeScript + PostgreSQL. |
| **SQLAlchemy** | Industry standard Python ORM. Mature, flexible, well-documented. |
| **MongoDB** | Assessment reports are document-shaped (nested scores, arrays). Schema flexibility fits evolving report formats. |
| **RabbitMQ** | Task queue pattern (not event streaming). Supports retries, DLQ, acknowledgments out of the box. |
| **Nginx** | Battle-tested reverse proxy. Simple config, high performance, JWT validation via subrequest. |

## API Gateway Routing

| Path | Service | Port |
|---|---|---|
| `/api/auth/*` | Core Service | 3001 |
| `/api/users/*` | Core Service | 3001 |
| `/api/jobs/*` | Core Service | 3001 |
| `/api/applications/*` | Core Service | 3001 |
| `/api/interviews/*` | AI Service | 3002 |
| `/api/chat/*` | AI Service | 3002 |
| `/interview/:token/*` | AI Service | 3002 |
| `/api/reports/*` | Assessment Service | 3004 |

> `/interview/:token/*` is the **public magic link** route. It does NOT require JWT — authentication is done via the token in the URL. All other `/api/*` routes require JWT (HR only).

> RAG Service (port 3003) is **never** exposed through the gateway.
