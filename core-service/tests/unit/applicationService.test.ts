process.env.STORAGE_CV_PATH = './test-cv-storage-unit';

import { applicationRepository } from '../../src/repositories/applicationRepository';
import { jobRepository } from '../../src/repositories/jobRepository';
import { publishCvUploaded } from '../../src/events/publishers/cvPublisher';
import { publishSendEmailInvite } from '../../src/events/publishers/emailPublisher';
import { AppError } from '../../src/utils/AppError';
import { ApplicationStatus, JobStatus } from '@prisma/client';
import { getChannel } from '../../src/events/connection';
import fs from 'fs';

jest.mock('../../src/repositories/applicationRepository');
jest.mock('../../src/repositories/jobRepository');
jest.mock('../../src/events/publishers/cvPublisher');
jest.mock('../../src/events/publishers/emailPublisher');
jest.mock('../../src/events/connection');
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { applicationService } from '../../src/services/applicationService';
import { consumeCvReady } from '../../src/events/consumers/cvReadyConsumer';

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

describe('applicationService.uploadCV', () => {
  afterEach(() => jest.clearAllMocks());

  it('uploads CV successfully', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);
    (applicationRepository.create as jest.Mock).mockResolvedValue(MOCK_APPLICATION);

    const mockFile = {
      path: '/storage/cv/mock-file.pdf',
      filename: 'mock-file.pdf',
    } as Express.Multer.File;

    const result = await applicationService.uploadCV(
      'hr-uuid-1',
      'job-uuid-1',
      mockFile,
      'Nguyen Van A',
      'candidate@email.com',
      'corr-id-1'
    );

    expect(result.id).toBe('app-uuid-1');
    expect(jobRepository.findById).toHaveBeenCalledWith('job-uuid-1');
    expect(applicationRepository.create).toHaveBeenCalledTimes(1);
    expect(publishCvUploaded).toHaveBeenCalledWith(
      'app-uuid-1',
      '/storage/cv/mock-file.pdf',
      'job-uuid-1',
      'corr-id-1'
    );
  });

  it('throws 403 if job does not belong to HR', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);

    const mockFile = {
      path: '/storage/cv/mock-file.pdf',
      filename: 'mock-file.pdf',
    } as Express.Multer.File;

    await expect(
      applicationService.uploadCV(
        'hr-uuid-different',
        'job-uuid-1',
        mockFile,
        'Nguyen Van A',
        'candidate@email.com',
        'corr-id-1'
      )
    ).rejects.toThrow(AppError);

    expect(applicationRepository.create).not.toHaveBeenCalled();
    expect(publishCvUploaded).not.toHaveBeenCalled();
  });

  it('throws 404 if job does not exist', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(null);

    const mockFile = {
      path: '/storage/cv/mock-file.pdf',
      filename: 'mock-file.pdf',
    } as Express.Multer.File;

    await expect(
      applicationService.uploadCV(
        'hr-uuid-1',
        'job-uuid-different',
        mockFile,
        'Nguyen Van A',
        'candidate@email.com',
        'corr-id-1'
      )
    ).rejects.toThrow(AppError);
  });

  it('throws AppError if file is not a valid PDF', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);
    
    // Create a temporary file
    const tempFilePath = './test-cv-storage-unit/temp-invalid.pdf';
    if (!fs.existsSync('./test-cv-storage-unit')) {
      fs.mkdirSync('./test-cv-storage-unit', { recursive: true });
    }
    fs.writeFileSync(tempFilePath, 'NOT_A_PDF_CONTENT');

    const mockFile = {
      path: tempFilePath,
      filename: 'temp-invalid.pdf',
      size: 100,
    } as Express.Multer.File;

    await expect(
      applicationService.uploadCV(
        'hr-uuid-1',
        'job-uuid-1',
        mockFile,
        'Nguyen Van A',
        'candidate@email.com',
        'corr-id-1'
      )
    ).rejects.toThrow('Uploaded file is not a valid PDF document.');

    expect(fs.existsSync(tempFilePath)).toBe(false);
  });

  it('allows upload if file is a valid PDF', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);
    (applicationRepository.create as jest.Mock).mockResolvedValue(MOCK_APPLICATION);

    const tempFilePath = './test-cv-storage-unit/temp-valid.pdf';
    if (!fs.existsSync('./test-cv-storage-unit')) {
      fs.mkdirSync('./test-cv-storage-unit', { recursive: true });
    }
    fs.writeFileSync(tempFilePath, '%PDF-1.4');

    const mockFile = {
      path: tempFilePath,
      filename: 'temp-valid.pdf',
      size: 100,
    } as Express.Multer.File;

    const result = await applicationService.uploadCV(
      'hr-uuid-1',
      'job-uuid-1',
      mockFile,
      'Nguyen Van A',
      'candidate@email.com',
      'corr-id-1'
    );

    expect(result.id).toBe('app-uuid-1');
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  });

  it('throws AppError if storage limit exceeded', async () => {
    (jobRepository.findById as jest.Mock).mockResolvedValue(MOCK_JOB);
    
    const tempFilePath = './test-cv-storage-unit/temp-limit.pdf';
    if (!fs.existsSync('./test-cv-storage-unit')) {
      fs.mkdirSync('./test-cv-storage-unit', { recursive: true });
    }
    fs.writeFileSync(tempFilePath, '%PDF-1.4');

    const mockFile = {
      path: tempFilePath,
      filename: 'temp-limit.pdf',
      size: 101 * 1024 * 1024, // 101 MB (exceeds default 100MB limit)
    } as Express.Multer.File;

    await expect(
      applicationService.uploadCV(
        'hr-uuid-1',
        'job-uuid-1',
        mockFile,
        'Nguyen Van A',
        'candidate@email.com',
        'corr-id-1'
      )
    ).rejects.toThrow('exceeded');

    expect(fs.existsSync(tempFilePath)).toBe(false);
  });
});

describe('applicationService.updateStatus', () => {
  afterEach(() => jest.clearAllMocks());

  it('updates status when transition is allowed', async () => {
    (applicationRepository.findById as jest.Mock).mockResolvedValue({
      ...MOCK_APPLICATION,
      status: ApplicationStatus.PROCESSING,
    });
    (applicationRepository.updateStatus as jest.Mock).mockResolvedValue({
      ...MOCK_APPLICATION,
      status: ApplicationStatus.READY_FOR_INTERVIEW,
    });

    const result = await applicationService.updateStatus(
      'hr-uuid-1',
      'app-uuid-1',
      ApplicationStatus.READY_FOR_INTERVIEW,
      'corr-id'
    );

    expect(result.status).toBe(ApplicationStatus.READY_FOR_INTERVIEW);
    expect(applicationRepository.updateStatus).toHaveBeenCalledWith(
      'app-uuid-1',
      ApplicationStatus.READY_FOR_INTERVIEW
    );
  });

  it('throws AppError 400 when transition is forbidden', async () => {
    (applicationRepository.findById as jest.Mock).mockResolvedValue({
      ...MOCK_APPLICATION,
      status: ApplicationStatus.PROCESSING,
    });

    await expect(
      applicationService.updateStatus(
        'hr-uuid-1',
        'app-uuid-1',
        ApplicationStatus.INVITED, // Forbidden directly from PROCESSING
        'corr-id'
      )
    ).rejects.toThrow(AppError);
  });

  it('throws 403 when updating other HRs applications', async () => {
    (applicationRepository.findById as jest.Mock).mockResolvedValue(MOCK_APPLICATION);

    await expect(
      applicationService.updateStatus(
        'hr-uuid-different',
        'app-uuid-1',
        ApplicationStatus.READY_FOR_INTERVIEW,
        'corr-id'
      )
    ).rejects.toThrow(AppError);
  });
});

describe('applicationService.sendInvite', () => {
  afterEach(() => jest.clearAllMocks());

  it('sends invite successfully', async () => {
    (applicationRepository.findById as jest.Mock).mockResolvedValue({
      ...MOCK_APPLICATION,
      status: ApplicationStatus.READY_FOR_INTERVIEW,
    });
    (applicationRepository.updateStatus as jest.Mock).mockResolvedValue({
      ...MOCK_APPLICATION,
      status: ApplicationStatus.INVITED,
    });

    const result = await applicationService.sendInvite('hr-uuid-1', 'app-uuid-1', 'corr-id-1');

    expect(result.status).toBe(ApplicationStatus.INVITED);
    expect(applicationRepository.setMagicLinkToken).toHaveBeenCalledTimes(1);
    expect(publishSendEmailInvite).toHaveBeenCalledTimes(1);
  });

  it('throws 400 if application status is not READY_FOR_INTERVIEW', async () => {
    (applicationRepository.findById as jest.Mock).mockResolvedValue({
      ...MOCK_APPLICATION,
      status: ApplicationStatus.PROCESSING,
    });

    await expect(
      applicationService.sendInvite('hr-uuid-1', 'app-uuid-1', 'corr-id-1')
    ).rejects.toThrow(AppError);
  });

  it('throws 400 if candidate email is missing', async () => {
    (applicationRepository.findById as jest.Mock).mockResolvedValue({
      ...MOCK_APPLICATION,
      status: ApplicationStatus.READY_FOR_INTERVIEW,
      candidateEmail: null,
    });

    await expect(
      applicationService.sendInvite('hr-uuid-1', 'app-uuid-1', 'corr-id-1')
    ).rejects.toThrow(AppError);
  });
});

describe('cvReadyConsumer', () => {
  afterEach(() => jest.clearAllMocks());

  it('processes success message correctly', async () => {
    const mockChannel = {
      consume: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
    };
    (getChannel as jest.Mock).mockReturnValue(mockChannel);

    // Call consumer setup
    await consumeCvReady();

    expect(mockChannel.consume).toHaveBeenCalledTimes(1);
    const callback = mockChannel.consume.mock.calls[0][1];

    const message = {
      content: Buffer.from(
        JSON.stringify({
          application_id: 'app-uuid-1',
          status: 'success',
          extracted_email: 'extracted@email.com',
          extracted_name: 'Nguyen Van Extracted',
          correlation_id: 'corr-id-1',
        })
      ),
    } as any;

    await callback(message);

    expect(applicationRepository.updateStatus).toHaveBeenCalledWith(
      'app-uuid-1',
      ApplicationStatus.READY_FOR_INTERVIEW
    );
    expect(applicationRepository.updateCandidateInfo).toHaveBeenCalledWith(
      'app-uuid-1',
      'extracted@email.com',
      'Nguyen Van Extracted'
    );
    expect(mockChannel.ack).toHaveBeenCalledWith(message);
  });

  it('processes failed message correctly', async () => {
    const mockChannel = {
      consume: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
    };
    (getChannel as jest.Mock).mockReturnValue(mockChannel);

    await consumeCvReady();
    const callback = mockChannel.consume.mock.calls[0][1];

    const message = {
      content: Buffer.from(
        JSON.stringify({
          application_id: 'app-uuid-1',
          status: 'failed',
          correlation_id: 'corr-id-2',
        })
      ),
    } as any;

    await callback(message);

    expect(applicationRepository.updateStatus).toHaveBeenCalledWith(
      'app-uuid-1',
      ApplicationStatus.CV_PARSE_FAILED
    );
    expect(mockChannel.ack).toHaveBeenCalledWith(message);
  });
});

afterAll(() => {
  if (fs.existsSync('./test-cv-storage-unit')) {
    fs.rmSync('./test-cv-storage-unit', { recursive: true, force: true });
  }
});
