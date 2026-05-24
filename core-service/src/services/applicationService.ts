import { applicationRepository } from '../repositories/applicationRepository';
import { jobRepository } from '../repositories/jobRepository';
import { AppError } from '../utils/AppError';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { publishCvUploaded } from '../events/publishers/cvPublisher';
import { publishSendEmailInvite, publishSendEmailRejection } from '../events/publishers/emailPublisher';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';
import prisma from '../repositories/prismaClient';

const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.PENDING]: [ApplicationStatus.PROCESSING, ApplicationStatus.REJECTED],
  [ApplicationStatus.PROCESSING]: [ApplicationStatus.READY_FOR_INTERVIEW, ApplicationStatus.CV_PARSE_FAILED, ApplicationStatus.REJECTED],
  [ApplicationStatus.READY_FOR_INTERVIEW]: [ApplicationStatus.INVITED, ApplicationStatus.REJECTED],
  [ApplicationStatus.CV_PARSE_FAILED]: [ApplicationStatus.PROCESSING, ApplicationStatus.REJECTED],
  [ApplicationStatus.INVITED]: [ApplicationStatus.INTERVIEWING, ApplicationStatus.REJECTED],
  [ApplicationStatus.INTERVIEWING]: [ApplicationStatus.COMPLETED, ApplicationStatus.REJECTED],
  [ApplicationStatus.COMPLETED]: [ApplicationStatus.ARCHIVED, ApplicationStatus.REJECTED],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.ARCHIVED]: [],
};

export const applicationService = {
  async uploadCV(
    hrId: string,
    jobId: string,
    file: Express.Multer.File,
    candidateName?: string,
    candidateEmail?: string,
    correlationId: string = uuidv4()
  ) {
    // 1. Verify Job exists and belongs to the HR
    const job = await jobRepository.findById(jobId);
    if (!job) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new AppError(404, 'JOB_NOT_FOUND', `Job not found with ID: ${jobId}`);
    }
    if (job.hrId !== hrId) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to upload CV to this job.');
    }

    // PDF Magic Number Verification
    // Per PDF spec, %PDF- header should appear within the first 1024 bytes.
    // Some PDF generators prepend BOM (0xEF 0xBB 0xBF) or whitespace before the header.
    if (file.path && fs.existsSync(file.path)) {
      try {
        const fd = fs.openSync(file.path, 'r');
        const searchSize = Math.min(1024, file.size);
        const buffer = Buffer.alloc(searchSize);
        fs.readSync(fd, buffer, 0, searchSize, 0);
        fs.closeSync(fd);
        const headerContent = buffer.toString('utf-8');
        const pdfMarkerIndex = headerContent.indexOf('%PDF');
        const isPdf = pdfMarkerIndex >= 0;

        logger.info({
          event: 'application.upload.pdf_signature_check',
          filePath: file.path,
          fileSize: file.size,
          originalName: file.originalname,
          firstBytes: Array.from(buffer.subarray(0, 10)),
          pdfMarkerIndex,
          isPdf,
        });

        if (!isPdf) {
          logger.warn({
            event: 'application.upload.invalid_pdf_signature',
            filePath: file.path,
            fileSize: file.size,
            firstBytes: Array.from(buffer.subarray(0, 20)),
            mimeType: file.mimetype,
          });
          fs.unlinkSync(file.path);
          throw new AppError(400, 'INVALID_FILE_SIGNATURE', 'Uploaded file is not a valid PDF document.');
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        logger.error({
          event: 'application.upload.signature_check_error',
          filePath: file.path,
          error: (err as Error).message,
        });
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        throw new AppError(400, 'READ_ERROR', 'Failed to verify file signature.');
      }
    }

    // Global Storage Limit Check
    const maxLimitMb = parseInt(process.env.STORAGE_MAX_LIMIT_MB || '100', 10);
    const maxLimitBytes = maxLimitMb * 1024 * 1024;
    
    const getDirSize = (dirPath: string): number => {
      let size = 0;
      if (!fs.existsSync(dirPath)) return 0;
      const files = fs.readdirSync(dirPath);
      for (const f of files) {
        const filePath = path.join(dirPath, f);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          size += stats.size;
        } else if (stats.isDirectory()) {
          size += getDirSize(filePath);
        }
      }
      return size;
    };

    if (!fs.existsSync(config.storage.cvPath)) {
      fs.mkdirSync(config.storage.cvPath, { recursive: true });
    }

    const currentSize = getDirSize(config.storage.cvPath);
    if (currentSize + file.size > maxLimitBytes) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new AppError(507, 'STORAGE_LIMIT_EXCEEDED', `Global CV storage limit of ${maxLimitMb}MB exceeded.`);
    }

    // Save relative or absolute path in DB depending on configuration
    const cvFilePath = file.path;

    try {
      // 2. Create Application in database (Initial status: PENDING, transitioned immediately to PROCESSING)
      const application = await applicationRepository.create({
        jobId,
        cvFilePath,
        candidateName: candidateName?.trim() || null,
        candidateEmail: candidateEmail?.trim() || null,
        status: ApplicationStatus.PROCESSING,
      });

      logger.info({
        event: 'application.created',
        correlation_id: correlationId,
        applicationId: application.id,
        jobId,
        status: application.status,
      });

      // 3. Publish CV_UPLOADED event to RabbitMQ
      await publishCvUploaded(
        application.id,
        cvFilePath,
        jobId,
        correlationId
      );

      return application;
    } catch (err) {
      // Handle unique constraint violation (unique_candidate_per_job)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Find existing application to return its ID
        const existingApp = await applicationRepository.findByCandidateAndJob(candidateEmail?.trim() || '', jobId);
        throw new AppError(
          409,
          'DUPLICATE_APPLICATION',
          'Ứng viên với email này đã ứng tuyển cho vị trí này.',
          existingApp ? { existingApplicationId: existingApp.id } : null
        );
      }
      throw err;
    }
  },

  async getApplications(query: { hrId?: string; jobId?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const { applications, total } = await applicationRepository.findAll(
      { jobId: query.jobId, hrId: query.hrId, status: query.status },
      { skip, take: limit }
    );

    return {
      applications,
      total,
      page,
      limit,
    };
  },

  async getApplicationById(id: string) {
    const application = await applicationRepository.findById(id);
    if (!application) {
      throw new AppError(404, 'APPLICATION_NOT_FOUND', `Application not found with ID: ${id}`);
    }
    return application;
  },

  async updateStatus(hrId: string, id: string, targetStatus: ApplicationStatus, correlationId: string = uuidv4()) {
    const application = await applicationRepository.findById(id);
    if (!application) {
      throw new AppError(404, 'APPLICATION_NOT_FOUND', `Application not found with ID: ${id}`);
    }

    // Verify HR owns the job associated with this application
    if (application.job.hrId !== hrId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to update this application.');
    }

    const currentStatus = application.status;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new AppError(
        400,
        'INVALID_STATUS_TRANSITION',
        `Cannot transition application status from ${currentStatus} to ${targetStatus}`
      );
    }

    // Perform Archiving Move if transition is to ARCHIVED
    let finalCvPath = application.cvFilePath;
    if (targetStatus === ApplicationStatus.ARCHIVED && application.cvFilePath && application.cvFilePath !== 'DELETED') {
      const archiveDir = path.join(config.storage.cvPath, 'archive');
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }
      const fileName = path.basename(application.cvFilePath);
      const newPath = path.join(archiveDir, fileName);

      if (fs.existsSync(application.cvFilePath)) {
        try {
          fs.renameSync(application.cvFilePath, newPath);
          await applicationRepository.updateCvFilePath(id, newPath);
          finalCvPath = newPath;
          logger.info({
            event: 'application.archive.file_moved',
            correlation_id: correlationId,
            applicationId: id,
            fromPath: application.cvFilePath,
            toPath: newPath,
          });
        } catch (err) {
          logger.error({
            event: 'application.archive.file_move_failed',
            correlation_id: correlationId,
            applicationId: id,
            error: (err as Error).message,
          });
        }
      }
    }

    const updatedApplication = await applicationRepository.updateStatus(id, targetStatus);
    updatedApplication.cvFilePath = finalCvPath;

    logger.info({
      event: 'application.status.updated',
      correlation_id: correlationId,
      applicationId: id,
      from: currentStatus,
      to: targetStatus,
    });

    return updatedApplication;
  },

  async sendInvite(hrId: string, id: string, correlationId: string = uuidv4(), overrideData?: { candidateName?: string; candidateEmail?: string }) {
    const application = await applicationRepository.findById(id);
    if (!application) {
      throw new AppError(404, 'APPLICATION_NOT_FOUND', `Application not found with ID: ${id}`);
    }

    // Verify HR owns the job
    if (application.job.hrId !== hrId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to invite candidates for this application.');
    }

    if (application.status !== ApplicationStatus.READY_FOR_INTERVIEW) {
      throw new AppError(
        400,
        'INVALID_STATUS',
        `Application status must be READY_FOR_INTERVIEW to send invite. Current status is ${application.status}.`
      );
    }

    // Apply override data if provided
    if (overrideData && (overrideData.candidateName || overrideData.candidateEmail)) {
      await applicationRepository.updateCandidateInfo(
        id,
        overrideData.candidateEmail,
        overrideData.candidateName
      );
    }

    const candidateEmail = overrideData?.candidateEmail || application.candidateEmail;
    const candidateName = overrideData?.candidateName || application.candidateName || 'Candidate';

    if (!candidateEmail) {
      throw new AppError(400, 'MISSING_EMAIL', 'Candidate email is required to send an interview invitation.');
    }
    
    const jobTitle = application.job.title;
    
    // Generate magic link token
    const token = uuidv4();
    await applicationRepository.setMagicLinkToken(id, token);
    
    // Transition status to INVITED
    const updatedApplication = await applicationRepository.updateStatus(id, ApplicationStatus.INVITED);
    
    const magicLinkUrl = `${config.frontendUrl}/interview/${token}`;

    // Publish SEND_EMAIL event
    await publishSendEmailInvite(
      candidateEmail,
      candidateName,
      jobTitle,
      magicLinkUrl,
      correlationId
    );

    logger.info({
      event: 'application.invited',
      correlation_id: correlationId,
      applicationId: id,
      candidateEmail,
    });

    return updatedApplication;
  },

  async rejectApplication(hrId: string, id: string, correlationId: string = uuidv4()) {
    const application = await applicationRepository.findById(id);
    if (!application) {
      throw new AppError(404, 'APPLICATION_NOT_FOUND', `Application not found with ID: ${id}`);
    }

    // Verify HR owns the job
    if (application.job.hrId !== hrId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to reject this application.');
    }

    // Check status transition is valid
    const currentStatus = application.status;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(ApplicationStatus.REJECTED)) {
      throw new AppError(
        400,
        'INVALID_STATUS_TRANSITION',
        `Cannot transition application status from ${currentStatus} to REJECTED`
      );
    }

    // Update status to REJECTED
    const updatedApplication = await applicationRepository.updateStatus(id, ApplicationStatus.REJECTED);

    // Publish rejection email if candidate email exists
    if (application.candidateEmail) {
      const candidateName = application.candidateName || 'Candidate';
      const jobTitle = application.job.title;
      await publishSendEmailRejection(
        application.candidateEmail,
        candidateName,
        jobTitle,
        correlationId
      );
    }

    logger.info({
      event: 'application.rejected',
      correlation_id: correlationId,
      applicationId: id,
      from: currentStatus,
      to: ApplicationStatus.REJECTED,
    });

    return updatedApplication;
  },

  async deleteApplication(hrId: string, id: string, correlationId: string = uuidv4()) {
    const application = await applicationRepository.findById(id);
    if (!application) {
      throw new AppError(404, 'APPLICATION_NOT_FOUND', `Application not found with ID: ${id}`);
    }

    // Verify HR owns the job
    if (application.job.hrId !== hrId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this application.');
    }

    // Delete CV file from disk if it exists
    if (application.cvFilePath && application.cvFilePath !== 'DELETED' && fs.existsSync(application.cvFilePath)) {
      try {
        fs.unlinkSync(application.cvFilePath);
        logger.info({
          event: 'application.delete.file_removed',
          correlation_id: correlationId,
          applicationId: id,
          filePath: application.cvFilePath,
        });
      } catch (err) {
        logger.error({
          event: 'application.delete.file_remove_failed',
          correlation_id: correlationId,
          applicationId: id,
          error: (err as Error).message,
        });
      }
    }

    // Delete application record from DB
    await applicationRepository.delete(id);

    logger.info({
      event: 'application.deleted',
      correlation_id: correlationId,
      applicationId: id,
    });

    return application;
  },

  async validateMagicToken(token: string, correlationId: string = uuidv4()) {
    const application = await applicationRepository.findByMagicLinkToken(token);
    if (!application) {
      throw new AppError(404, 'TOKEN_NOT_FOUND', 'Magic link token is invalid.');
    }

    if (application.isLinkUsed) {
      throw new AppError(403, 'TOKEN_ALREADY_USED', 'This magic link has already been used.');
    }

    if (application.status !== ApplicationStatus.INVITED) {
      throw new AppError(400, 'INVALID_STATUS', `Application status must be INVITED to start interview. Current status is ${application.status}.`);
    }

    // Atomically mark link as used and transition status
    await applicationRepository.markLinkUsed(application.id);
    await applicationRepository.updateStatus(application.id, ApplicationStatus.INTERVIEWING);

    logger.info({
      event: 'application.magic_token.validated',
      correlation_id: correlationId,
      applicationId: application.id,
    });

    return {
      application_id: application.id,
      job_id: application.jobId,
      candidate_name: application.candidateName || 'Candidate',
      job_title: application.job.title,
    };
  },

  async getCvFile(hrId: string, applicationId: string, correlationId: string = uuidv4()) {
    const application = await applicationRepository.findById(applicationId);
    if (!application) {
      throw new AppError(404, 'APPLICATION_NOT_FOUND', `Application not found with ID: ${applicationId}`);
    }

    // Verify HR owns the job associated with this application
    if (application.job.hrId !== hrId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this CV file.');
    }

    const filePath = application.cvFilePath;
    if (!filePath || filePath === 'DELETED' || !fs.existsSync(filePath)) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'CV file not found or has been deleted.');
    }

    logger.info({
      event: 'application.cv_file.served',
      correlation_id: correlationId,
      applicationId,
    });

    return filePath;
  },

  async getCvAnalysis(hrId: string, applicationId: string, correlationId: string = uuidv4()) {
    const application = await applicationRepository.findById(applicationId);
    if (!application) {
      throw new AppError(404, 'APPLICATION_NOT_FOUND', `Application not found with ID: ${applicationId}`);
    }

    // Verify HR owns the job associated with this application
    if (application.job.hrId !== hrId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this CV analysis.');
    }

    const ragUrl = `${config.services.ragServiceUrl}/internal/documents/${applicationId}/analyze`;

    logger.info({
      event: 'application.cv_analysis.requesting',
      correlation_id: correlationId,
      applicationId,
      ragUrl,
    });

    try {
      const response = await fetch(ragUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
        body: JSON.stringify({
          job_title: application.job.title,
          job_requirements: application.job.requirements || application.job.description,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error({
          event: 'application.cv_analysis.rag_error',
          correlation_id: correlationId,
          applicationId,
          statusCode: response.status,
          errorBody,
        });

        if (response.status === 404) {
          throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'CV document not found in RAG service.');
        }
        throw new AppError(response.status, 'RAG_SERVICE_ERROR', `RAG service returned status ${response.status}`);
      }

      const data = (await response.json()) as any;

      logger.info({
        event: 'application.cv_analysis.success',
        correlation_id: correlationId,
        applicationId,
      });

      // RAG returns { success: true, data: { ...analysis } }
      return data?.data || data;
    } catch (err) {
      if (err instanceof AppError) throw err;

      logger.error({
        event: 'application.cv_analysis.connection_failed',
        correlation_id: correlationId,
        applicationId,
        error: (err as Error).message,
      });

      throw new AppError(503, 'RAG_SERVICE_UNAVAILABLE', 'RAG service is currently unavailable.');
    }
  },

  async runCleanupJobs() {
    const now = new Date();
    
    // 1. Expire stale INVITED applications (updated > 48h ago) back to READY_FOR_INTERVIEW
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    try {
      const staleInvited = await prisma.application.findMany({
        where: {
          status: ApplicationStatus.INVITED,
          updatedAt: { lt: fortyEightHoursAgo }
        }
      });
      
      for (const app of staleInvited) {
        await prisma.application.update({
          where: { id: app.id },
          data: {
            status: ApplicationStatus.READY_FOR_INTERVIEW,
            magicLinkToken: null
          }
        });
        logger.info({
          event: 'application.stale_invitation.reset',
          applicationId: app.id,
          candidateEmail: app.candidateEmail
        });
      }
    } catch (err) {
      logger.error({
        event: 'application.stale_invitation_cleanup.failed',
        error: (err as Error).message
      });
    }

    // 2. Delete CV files of applications with CV_PARSE_FAILED older than 24 hours
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    try {
      const failedApps = await prisma.application.findMany({
        where: {
          status: ApplicationStatus.CV_PARSE_FAILED,
          updatedAt: { lt: twentyFourHoursAgo },
          NOT: {
            cvFilePath: 'DELETED'
          }
        }
      });
      
      for (const app of failedApps) {
        if (app.cvFilePath && app.cvFilePath !== 'DELETED' && fs.existsSync(app.cvFilePath)) {
          try {
            fs.unlinkSync(app.cvFilePath);
            logger.info({
              event: 'application.failed_cv.deleted_file',
              applicationId: app.id,
              filePath: app.cvFilePath
            });
          } catch (unlinkErr) {
            logger.error({
              event: 'application.failed_cv.delete_file_failed',
              error: (unlinkErr as Error).message,
              filePath: app.cvFilePath
            });
          }
        }
        await prisma.application.update({
          where: { id: app.id },
          data: {
            cvFilePath: 'DELETED'
          }
        });
      }
    } catch (err) {
      logger.error({
        event: 'application.failed_cv_cleanup.failed',
        error: (err as Error).message
      });
    }
  }
};
