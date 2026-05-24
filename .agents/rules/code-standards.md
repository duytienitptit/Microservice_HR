# Code Standards — MANDATORY

## Node.js Services (core-service, assessment-service)

- **Runtime:** Node.js 20+ with TypeScript (strict mode)
- **Framework:** Express.js
- **ORM:** Prisma (PostgreSQL), Mongoose (MongoDB)
- **Test:** Jest + Supertest
- **Linting:** ESLint with recommended rules
- **Package manager:** npm

## Python Services (ai-service, rag-service)

- **Runtime:** Python 3.11+
- **Framework:** FastAPI with Pydantic v2
- **Test:** Pytest + httpx (AsyncClient)
- **Linting:** Ruff
- **Package manager:** pip with requirements.txt

## Response Envelope — ALL services MUST use this

```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 100 }
}

// Error
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Human-readable message",
    "details": null
  }
}
```

## Structured Logging

Every log line MUST be JSON with these fields: `timestamp`, `level`, `service`, `correlation_id`, `event`.

- Node.js: **Winston**
- Python: **Loguru**

## Health Check

Every service MUST expose `GET /health`:

```json
{ "status": "healthy", "service": "<name>", "version": "1.0.0" }
```

## Correlation ID

- Forward `X-Correlation-ID` header through ALL HTTP calls
- Embed in ALL RabbitMQ message payloads
- Include in every log line

## Environment Variables

- Use `.env` files for configuration
- NEVER hardcode secrets, URLs, or credentials
- Every service MUST have `.env.example` documenting all required vars

## Error Handling

- Always catch errors. Never let unhandled exceptions crash the service.
- Use centralized error handling middleware.
- Return proper HTTP status codes with error envelope.

## File Structure per Service

```
<service-name>/
├── src/                    # (Node.js) or app/ (Python)
│   ├── controllers/        # (Node) or routers/ (Python) — HTTP handlers
│   ├── services/           # Business logic
│   ├── repositories/       # (Node) or models/ (Python) — Data access
│   ├── middlewares/         # Auth, error handling, logging
│   ├── events/             # RabbitMQ publishers & consumers
│   └── routes/             # (Node only) Route definitions
├── tests/                  # Unit and integration tests
├── Dockerfile
├── package.json            # (Node) or requirements.txt (Python)
└── .env.example
```
