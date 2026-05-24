import { jobRepository } from '../../src/repositories/jobRepository';
import { AppError } from '../../src/utils/AppError';
import { JobStatus } from '@prisma/client';

jest.mock('../../src/repositories/jobRepository');
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { jobService } from '../../src/services/jobService';

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

describe('jobService.createJob', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates job successfully', async () => {
    (jobRepository.create as jest.Mock).mockResolvedValue(MOCK_JOB);

    const result = await jobService.createJob(
      'hr-uuid-1',
      {
        title: 'Backend Engineer',
        description: 'Node.js/TypeScript developer',
        requirements: '3+ years experience',
      },
      'corr-id-1'
    );

    expect(result.id).toBe('job-uuid-1');
    expect(result.status).toBe(JobStatus.OPEN);
    expect(jobRepository.create).toHaveBeenCalledTimes(1);
  });

  it('throws validation error if fields are missing', async () => {
    await expect(
      jobService.createJob('hr-uuid-1', { title: '', description: 'desc', requirements: 'req' }, 'corr-id')
    ).rejects.toThrow(AppError);

    await expect(
      jobService.createJob('hr-uuid-1', { title: 'title', description: '', requirements: 'req' }, 'corr-id')
    ).rejects.toThrow(AppError);

    await expect(
      jobService.createJob('hr-uuid-1', { title: 'title', description: 'desc', requirements: '' }, 'corr-id')
    ).rejects.toThrow(AppError);
  });
});

describe('jobService.getJobs', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns paginated list of OPEN jobs', async () => {
    (jobRepository.findAll as jest.Mock).mockResolvedValue({
      jobs: [MOCK_JOB],
      total: 1,
    });

    const result = await jobService.getJobs({ page: 1, limit: 10 });

    expect(result.jobs).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(jobRepository.findAll).toHaveBeenCalledWith({ status: JobStatus.OPEN }, { skip: 0, take: 10 });
  });
});

describe('jobService.getJobById', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns job details if exists', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);

    const result = await jobService.getJobById('job-uuid-1');

    expect(result.id).toBe('job-uuid-1');
    expect(jobRepository.findById).toHaveBeenCalledWith('job-uuid-1');
  });

  it('throws 404 if job does not exist', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(jobService.getJobById('non-existent')).rejects.toThrow(AppError);
  });
});

describe('jobService.updateJob', () => {
  afterEach(() => jest.clearAllMocks());

  it('updates job if caller is owner', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);
    (jobRepository.update as jest.Mock).mockResolvedValue({
      ...MOCK_JOB,
      title: 'Senior Backend Engineer',
    });

    const result = await jobService.updateJob(
      'hr-uuid-1',
      'job-uuid-1',
      { title: 'Senior Backend Engineer' },
      'corr-id'
    );

    expect(result.title).toBe('Senior Backend Engineer');
    expect(jobRepository.update).toHaveBeenCalledWith('job-uuid-1', { title: 'Senior Backend Engineer' });
  });

  it('throws 403 if caller is not owner', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);

    await expect(
      jobService.updateJob('hr-uuid-2', 'job-uuid-1', { title: 'Updated' }, 'corr-id')
    ).rejects.toThrow(AppError);

    expect(jobRepository.update).not.toHaveBeenCalled();
  });

  it('throws 404 if job not found', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      jobService.updateJob('hr-uuid-1', 'non-existent', { title: 'Updated' }, 'corr-id')
    ).rejects.toThrow(AppError);
  });
});

describe('jobService.deleteJob', () => {
  afterEach(() => jest.clearAllMocks());

  it('soft deletes job if caller is owner', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);
    (jobRepository.softDelete as jest.Mock).mockResolvedValue({
      ...MOCK_JOB,
      status: JobStatus.CLOSED,
    });

    const result = await jobService.deleteJob('hr-uuid-1', 'job-uuid-1', 'corr-id');

    expect(result.status).toBe(JobStatus.CLOSED);
    expect(jobRepository.softDelete).toHaveBeenCalledWith('job-uuid-1');
  });

  it('throws 403 if caller is not owner', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);

    await expect(
      jobService.deleteJob('hr-uuid-2', 'job-uuid-1', 'corr-id')
    ).rejects.toThrow(AppError);

    expect(jobRepository.softDelete).not.toHaveBeenCalled();
  });

  it('throws 404 if job not found', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      jobService.deleteJob('hr-uuid-1', 'non-existent', 'corr-id')
    ).rejects.toThrow(AppError);
  });
});
