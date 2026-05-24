---
name: testing-strategy
description: Guides how to write unit and integration tests for this microservice project. Use when writing tests, setting up test infrastructure, or when asked to add test coverage. Covers Jest/Supertest (Node.js) and Pytest/httpx (Python).
---

# Testing Strategy

## When to Use

- Writing unit tests for business logic (`services/` layer)
- Writing integration tests for API endpoints
- Setting up test infrastructure (mocks, fixtures)

## Test Structure

```
tests/
├── unit/
│   ├── auth.service.test.ts       # Node.js
│   ├── test_auth_service.py       # Python
└── integration/
    ├── auth.api.test.ts           # Node.js
    ├── test_auth_api.py           # Python
```

## Rules

1. Every file in `services/` MUST have a corresponding test file
2. Test behavior, not implementation
3. NEVER connect to real RabbitMQ or external services in tests — always mock
4. Controllers/routers are tested via integration tests only

## Node.js: Jest + Supertest

### `jest.config.ts`

```typescript
import type { Config } from 'jest';
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: ['src/services/**/*.ts', 'src/utils/**/*.ts'],
  coverageThreshold: { global: { branches: 70, functions: 80, lines: 80 } },
};
export default config;
```

### Unit test pattern

```typescript
// Mock dependencies via constructor injection
const mockRepo = { findByEmail: jest.fn(), create: jest.fn() };
const service = new AuthService(mockRepo as any);

describe('AuthService.register', () => {
  it('should create user with hashed password', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({ id: '1', email: 'test@test.com' });
    const result = await service.register({ email: 'test@test.com', password: 'pass', role: 'CANDIDATE', full_name: 'Test' });
    expect(result.email).toBe('test@test.com');
  });
});
```

### Integration test pattern

```typescript
import request from 'supertest';
import app from '../../src/app';

describe('POST /api/auth/register', () => {
  it('should return 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@test.com', password: 'pass', role: 'CANDIDATE', full_name: 'New' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
```

## Python: Pytest + httpx

### `conftest.py`

```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

### Unit test pattern

```python
class TestInterviewService:
    async def test_start_creates_greeting(self, service):
        service.repo.create_session.return_value = {"id": "1", "stage": "GREETING"}
        result = await service.start_session(application_id="app-1")
        assert result["stage"] == "GREETING"
```

## Mocking External Deps

```typescript
// Node.js — mock RabbitMQ publisher
jest.mock('../../src/events/publisher', () => ({
  publishEvent: jest.fn().mockResolvedValue(undefined),
}));
```

```python
# Python — mock RabbitMQ publisher
@pytest.fixture
def mock_publisher(mocker):
    return mocker.patch('app.events.publisher.publish_event', new_callable=AsyncMock)
```

## Commands

```bash
# Node.js
npm test                    # Run all
npm test -- --coverage      # With coverage

# Python
pytest                      # Run all
pytest --cov=app            # With coverage
```

## Coverage Requirements

| Layer | Min Coverage |
|-------|-------------|
| `services/` | 80% |
| `utils/` | 80% |
| `controllers/routers` | 70% (integration) |
| `events/` | 70% |
