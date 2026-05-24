---
name: service-scaffolding
description: Scaffolds a new microservice with correct folder structure, boilerplate, Dockerfile, and config. Use when initializing a Node.js/Express/TypeScript service or Python/FastAPI service from scratch.
---

# Service Scaffolding

Use this skill when creating a new service from scratch or re-initializing an existing service directory.

## When to Use

- Initializing `core-service` or `assessment-service` (Node.js/Express/TypeScript)
- Initializing `ai-service` or `rag-service` (Python/FastAPI)
- Creating a new Dockerfile for any service
- Setting up project config (tsconfig, package.json, requirements.txt)

## Decision Tree

```
Is it a Node.js service?
├── YES → Use Node.js Template below
│   ├── Prisma ORM? → core-service (PostgreSQL)
│   └── Mongoose?   → assessment-service (MongoDB)
└── NO (Python) → Use Python Template below
    ├── SQLAlchemy? → ai-service (PostgreSQL)
    └── Raw SQL?    → rag-service (SQLite + Qdrant)
```

## Node.js Service Template (core-service, assessment-service)

### 1. Initialize project

```bash
npm init -y
npm install express cors helmet dotenv winston amqplib uuid
npm install -D typescript @types/node @types/express ts-node-dev jest ts-jest @types/jest supertest @types/supertest eslint
npx tsc --init
```

### 2. Required `tsconfig.json` overrides

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 3. Folder structure

```
<service>/
├── src/
│   ├── index.ts              # Entry point — app.listen()
│   ├── app.ts                # Express app setup (middlewares, routes)
│   ├── config/
│   │   └── index.ts          # Environment variables loader
│   ├── controllers/          # HTTP request handlers
│   ├── services/             # Business logic (MUST be tested)
│   ├── repositories/         # Data access layer (Prisma/Mongoose calls)
│   ├── middlewares/
│   │   ├── errorHandler.ts   # Centralized error handler
│   │   ├── authMiddleware.ts # JWT verification
│   │   └── correlationId.ts  # X-Correlation-ID middleware
│   ├── events/
│   │   ├── publisher.ts      # RabbitMQ publish helpers
│   │   └── consumer.ts       # RabbitMQ consume handlers
│   ├── routes/               # Route definitions
│   ├── utils/
│   │   ├── logger.ts         # Winston structured logger
│   │   └── AppError.ts       # Custom error class
│   └── types/                # Shared TypeScript types
├── tests/
│   ├── unit/                 # Unit tests (services/, utils/)
│   └── integration/          # API tests (supertest)
├── prisma/                   # (core-service only)
│   └── schema.prisma
├── Dockerfile
├── package.json
├── tsconfig.json
├── jest.config.ts
├── .env.example
└── .eslintrc.json
```

### 4. Required boilerplate files

#### `src/utils/logger.ts`
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: '<SERVICE_NAME>' },
  transports: [new winston.transports.Console()],
});

export default logger;
```

#### `src/middlewares/correlationId.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const correlationIdMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  req.headers['x-correlation-id'] = req.headers['x-correlation-id'] || uuidv4();
  next();
};
```

#### `src/utils/AppError.ts`
```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details: unknown = null
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

#### Health endpoint (add to routes)
```typescript
router.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: '<SERVICE_NAME>', version: '1.0.0' });
});
```

### 5. Dockerfile (Node.js)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE <PORT>
CMD ["node", "dist/index.js"]
```

---

## Python Service Template (ai-service, rag-service)

### 1. Initialize project

```bash
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn pydantic pydantic-settings aio-pika loguru httpx
pip install -D pytest pytest-asyncio httpx ruff
pip freeze > requirements.txt
```

### 2. Folder structure

```
<service>/
├── app/
│   ├── __init__.py
│   ├── main.py               # FastAPI app, startup/shutdown events
│   ├── config.py              # Pydantic Settings
│   ├── routers/               # FastAPI routers (HTTP handlers)
│   ├── services/              # Business logic (MUST be tested)
│   ├── models/                # SQLAlchemy models or Pydantic schemas
│   ├── schemas/               # Pydantic request/response schemas
│   ├── events/
│   │   ├── publisher.py       # RabbitMQ publish helpers
│   │   └── consumer.py        # RabbitMQ consume handlers
│   ├── middlewares/
│   │   └── correlation_id.py  # X-Correlation-ID middleware
│   └── utils/
│       └── logger.py          # Loguru structured logger
├── tests/
│   ├── unit/
│   └── integration/
├── Dockerfile
├── requirements.txt
└── .env.example
```

### 3. Required boilerplate

#### `app/config.py`
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = ""
    RABBITMQ_URL: str = "amqp://localhost:5672"
    SERVICE_NAME: str = "<service-name>"

    class Config:
        env_file = ".env"

settings = Settings()
```

#### `app/utils/logger.py`
```python
from loguru import logger
import sys, json

logger.remove()
logger.add(sys.stdout, format="{message}", serialize=True)
```

#### Health endpoint
```python
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "<SERVICE_NAME>", "version": "1.0.0"}
```

### 4. Dockerfile (Python)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE <PORT>
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "<PORT>"]
```

---

## Checklist After Scaffolding

- [ ] Health endpoint (`GET /health`) returns correct JSON
- [ ] Structured logging is configured (Winston/Loguru)
- [ ] Correlation ID middleware is installed
- [ ] `.env.example` lists all required environment variables
- [ ] Dockerfile builds successfully
- [ ] Error handling middleware is in place
- [ ] Tests directory exists with at least one placeholder test
