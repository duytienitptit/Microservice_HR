// ─── Mocks must be declared before imports ───────────────────
jest.mock('../../src/repositories/prismaClient', () => ({
  __esModule: true,
  default: {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $on: jest.fn(),
    user: {},
    refreshToken: {},
  },
}));

jest.mock('../../src/repositories/authRepository', () => ({
  userRepository: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  },
  refreshTokenRepository: {
    create: jest.fn(),
    findByToken: jest.fn(),
    deleteByToken: jest.fn(),
    deleteAllByUserId: jest.fn(),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

// ─── Imports after mocks ──────────────────────────────────────
import request from 'supertest';
import app from '../../src/app';
import { userRepository, refreshTokenRepository } from '../../src/repositories/authRepository';
import bcrypt from 'bcryptjs';

const MOCK_USER = {
  id: 'user-uuid-1',
  email: 'hr@example.com',
  passwordHash: 'hashed_password',
  fullName: 'HR Manager',
  role: 'HR' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /api/auth/register', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 201 with user data on success', async () => {
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    (userRepository.create as jest.Mock).mockResolvedValue(MOCK_USER);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'hr@example.com', password: 'password123', fullName: 'HR Manager', role: 'HR' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('hr@example.com');
  });

  it('returns 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 if password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'abc', fullName: 'Test' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 if email already exists', async () => {
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(MOCK_USER);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'hr@example.com', password: 'password123', fullName: 'HR Manager' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });
});

describe('POST /api/auth/login', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 200 with tokens on valid credentials', async () => {
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(MOCK_USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (refreshTokenRepository.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hr@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('returns 401 on invalid credentials', async () => {
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(MOCK_USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hr@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('POST /api/auth/refresh', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 400 if refreshToken is missing', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /health', () => {
  it('returns 200 with healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('core-service');
  });
});
