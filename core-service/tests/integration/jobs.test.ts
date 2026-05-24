jest.mock('../../src/repositories/prismaClient', () => ({
  __esModule: true,
  default: {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $on: jest.fn(),
    job: {},
  },
}));

jest.mock('../../src/repositories/jobRepository', () => ({
  jobRepository: {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import request from 'supertest';
import app from '../../src/app';
import { jobRepository } from '../../src/repositories/jobRepository';
import { JobStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-jwt-secret-for-unit-tests';

const generateToken = (userId: string, role: string = 'HR') => {
  return jwt.sign({ sub: userId, email: 'hr@example.com', role }, JWT_SECRET);
};

const MOCK_JOB = {
  id: 'job-uuid-1',
  title: 'Backend Engineer',
  description: 'Node.js/TypeScript developer',
  requirements: '3+ years experience',
  status: JobStatus.OPEN,
  hrId: 'hr-uuid-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /api/jobs', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates job and returns 201 for authenticated HR', async () => {
    (jobRepository.create as jest.Mock).mockResolvedValue(MOCK_JOB);
    const token = generateToken('hr-uuid-1');

    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Backend Engineer',
        description: 'Node.js/TypeScript developer',
        requirements: '3+ years experience',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.job.title).toBe('Backend Engineer');
  });

  it('returns 401 if token is missing', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .send({
        title: 'Backend Engineer',
        description: 'Node.js/TypeScript developer',
        requirements: '3+ years experience',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 if role is not HR', async () => {
    const token = generateToken('candidate-uuid-1', 'CANDIDATE');

    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Backend Engineer',
        description: 'Node.js/TypeScript developer',
        requirements: '3+ years experience',
      });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/jobs', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 200 with paginated open jobs publicly', async () => {
    (jobRepository.findAll as jest.Mock).mockResolvedValue({
      jobs: [MOCK_JOB],
      total: 1,
    });

    const res = await request(app).get('/api/jobs?page=1&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jobs).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
  });
});

describe('GET /api/jobs/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 200 with job details publicly', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);

    const res = await request(app).get('/api/jobs/job-uuid-1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.job.id).toBe('job-uuid-1');
  });

  it('returns 404 if job does not exist', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/jobs/non-existent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('PUT /api/jobs/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('updates job and returns 200 for HR owner', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);
    (jobRepository.update as jest.Mock).mockResolvedValue({
      ...MOCK_JOB,
      title: 'Senior Backend Developer',
    });
    const token = generateToken('hr-uuid-1');

    const res = await request(app)
      .put('/api/jobs/job-uuid-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Senior Backend Developer' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.job.title).toBe('Senior Backend Developer');
  });

  it('returns 403 if updater is not owner', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);
    const token = generateToken('hr-uuid-2'); // Different HR

    const res = await request(app)
      .put('/api/jobs/job-uuid-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Senior Backend Developer' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('DELETE /api/jobs/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('soft deletes job and returns 200 for HR owner', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);
    (jobRepository.softDelete as jest.Mock).mockResolvedValue({
      ...MOCK_JOB,
      status: JobStatus.CLOSED,
    });
    const token = generateToken('hr-uuid-1');

    const res = await request(app)
      .delete('/api/jobs/job-uuid-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.job.status).toBe(JobStatus.CLOSED);
  });

  it('returns 403 if deleter is not owner', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);
    const token = generateToken('hr-uuid-2');

    const res = await request(app)
      .delete('/api/jobs/job-uuid-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
