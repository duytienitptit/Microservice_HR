process.env.STORAGE_CV_PATH = './test-cv-storage-integration';

jest.mock('../../src/repositories/prismaClient', () => ({
  __esModule: true,
  default: {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $on: jest.fn(),
  },
}));

jest.mock('../../src/repositories/applicationRepository', () => ({
  applicationRepository: {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
    updateCandidateInfo: jest.fn(),
    setMagicLinkToken: jest.fn(),
  },
}));

jest.mock('../../src/repositories/jobRepository', () => ({
  jobRepository: {
    findById: jest.fn(),
  },
}));

jest.mock('../../src/events/connection', () => ({
  connectRabbitMQ: jest.fn().mockResolvedValue({}),
  getChannel: jest.fn().mockReturnValue({
    publish: jest.fn(),
  }),
  closeRabbitMQ: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/events/publishers/cvPublisher', () => ({
  publishCvUploaded: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/events/publishers/emailPublisher', () => ({
  publishSendEmailInvite: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import request from 'supertest';
import app from '../../src/app';
import { applicationRepository } from '../../src/repositories/applicationRepository';
import { jobRepository } from '../../src/repositories/jobRepository';
import { ApplicationStatus, JobStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import fs from 'fs';

const JWT_SECRET = 'test-jwt-secret-for-unit-tests';

const generateToken = (userId: string, role: string = 'HR') => {
  return jwt.sign({ sub: userId, email: 'hr@example.com', role }, JWT_SECRET);
};

const MOCK_JOB = {
  id: 'job-uuid-1',
  title: 'Backend Engineer',
  hrId: 'hr-uuid-1',
  status: JobStatus.OPEN,
};

const MOCK_APPLICATION = {
  id: 'app-uuid-1',
  jobId: 'job-uuid-1',
  cvFilePath: '/storage/cv/mock-file.pdf',
  candidateName: 'Nguyen Van A',
  candidateEmail: 'candidate@email.com',
  status: ApplicationStatus.PROCESSING,
  magicLinkToken: null,
  job: MOCK_JOB,
};

describe('POST /api/applications', () => {
  afterEach(() => jest.clearAllMocks());

  it('uploads CV and returns 201 for authorized HR', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);
    (applicationRepository.create as jest.Mock).mockResolvedValue(MOCK_APPLICATION);
    const token = generateToken('hr-uuid-1');

    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .attach('cv', Buffer.from('%PDF-1.4\nmock pdf content'), { filename: 'cv.pdf', contentType: 'application/pdf' })
      .field('job_id', 'job-uuid-1')
      .field('candidate_name', 'Nguyen Van A')
      .field('candidate_email', 'candidate@email.com');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.id).toBe('app-uuid-1');
  });

  it('returns 400 if file is missing', async () => {
    const token = generateToken('hr-uuid-1');

    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .field('job_id', 'job-uuid-1');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/applications', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 200 with application list', async () => {
    (applicationRepository.findAll as jest.Mock).mockResolvedValue({
      applications: [MOCK_APPLICATION],
      total: 1,
    });
    const token = generateToken('hr-uuid-1');

    const res = await request(app)
      .get('/api/applications?job_id=job-uuid-1&page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.applications).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
  });
});

describe('GET /api/applications/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 200 with application detail', async () => {
    (applicationRepository.findById as jest.Mock).mockResolvedValue(MOCK_APPLICATION);
    const token = generateToken('hr-uuid-1');

    const res = await request(app)
      .get('/api/applications/app-uuid-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.id).toBe('app-uuid-1');
  });
});

describe('PATCH /api/applications/:id/status', () => {
  afterEach(() => jest.clearAllMocks());

  it('updates status and returns 200', async () => {
    (applicationRepository.findById as jest.Mock).mockResolvedValue({
      ...MOCK_APPLICATION,
      status: ApplicationStatus.PROCESSING,
    });
    (applicationRepository.updateStatus as jest.Mock).mockResolvedValue({
      ...MOCK_APPLICATION,
      status: ApplicationStatus.READY_FOR_INTERVIEW,
    });
    const token = generateToken('hr-uuid-1');

    const res = await request(app)
      .patch('/api/applications/app-uuid-1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: ApplicationStatus.READY_FOR_INTERVIEW });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.status).toBe(ApplicationStatus.READY_FOR_INTERVIEW);
  });
});

describe('POST /api/applications/:id/invite', () => {
  afterEach(() => jest.clearAllMocks());

  it('generates magic link, transitions status, publishes event, and returns 200', async () => {
    (applicationRepository.findById as jest.Mock).mockResolvedValue({
      ...MOCK_APPLICATION,
      status: ApplicationStatus.READY_FOR_INTERVIEW,
    });
    (applicationRepository.updateStatus as jest.Mock).mockResolvedValue({
      ...MOCK_APPLICATION,
      status: ApplicationStatus.INVITED,
    });
    const token = generateToken('hr-uuid-1');

    const res = await request(app)
      .post('/api/applications/app-uuid-1/invite')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.status).toBe(ApplicationStatus.INVITED);
  });
});

afterAll(() => {
  if (fs.existsSync('./test-cv-storage-integration')) {
    fs.rmSync('./test-cv-storage-integration', { recursive: true, force: true });
  }
});
