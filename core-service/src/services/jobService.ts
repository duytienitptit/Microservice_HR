import { jobRepository } from '../repositories/jobRepository';
import { AppError } from '../utils/AppError';
import { JobStatus } from '@prisma/client';
import logger from '../utils/logger';

export interface CreateJobInput {
  title: string;
  description: string;
  requirements: string;
  status?: JobStatus;
}

export interface UpdateJobInput {
  title?: string;
  description?: string;
  requirements?: string;
  status?: JobStatus;
}

export const jobService = {
  async createJob(hrId: string, data: CreateJobInput, correlationId: string) {
    const { title, description, requirements, status } = data;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      throw new AppError(400, 'VALIDATION_ERROR', 'title is required and cannot be empty.');
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
      throw new AppError(400, 'VALIDATION_ERROR', 'description is required and cannot be empty.');
    }
    if (!requirements || typeof requirements !== 'string' || requirements.trim() === '') {
      throw new AppError(400, 'VALIDATION_ERROR', 'requirements is required and cannot be empty.');
    }

    const validStatus = status || JobStatus.OPEN;

    const job = await jobRepository.create({
      title: title.trim(),
      description: description.trim(),
      requirements: requirements.trim(),
      status: validStatus,
      hrId,
    });

    logger.info({
      event: 'job.create',
      correlation_id: correlationId,
      jobId: job.id,
      hrId,
    });

    return job;
  },

  async getJobs(query: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    // ONLY open jobs are returned publicly
    const status = JobStatus.OPEN;

    const skip = (page - 1) * limit;
    const { jobs, total } = await jobRepository.findAll({ status }, { skip, take: limit });

    return {
      jobs,
      total,
      page,
      limit,
    };
  },

  async getMyJobs(hrId: string, query: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const filters: { hrId: string; status?: JobStatus } = { hrId };
    if (query.status && Object.values(JobStatus).includes(query.status as JobStatus)) {
      filters.status = query.status as JobStatus;
    }

    const { jobs, total } = await jobRepository.findAll(filters, { skip, take: limit });

    return {
      jobs,
      total,
      page,
      limit,
    };
  },

  async getJobById(id: string) {
    const job = await jobRepository.findById(id);
    if (!job) {
      throw new AppError(404, 'JOB_NOT_FOUND', `Job not found with ID: ${id}`);
    }
    return job;
  },

  async updateJob(hrId: string, jobId: string, data: UpdateJobInput, correlationId: string) {
    const job = await jobRepository.findById(jobId);
    if (!job) {
      throw new AppError(404, 'JOB_NOT_FOUND', `Job not found with ID: ${jobId}`);
    }

    if (job.hrId !== hrId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to update this job.');
    }

    const { title, description, requirements, status } = data;
    const updateData: Partial<CreateJobInput> = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        throw new AppError(400, 'VALIDATION_ERROR', 'title cannot be empty.');
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim() === '') {
        throw new AppError(400, 'VALIDATION_ERROR', 'description cannot be empty.');
      }
      updateData.description = description.trim();
    }

    if (requirements !== undefined) {
      if (typeof requirements !== 'string' || requirements.trim() === '') {
        throw new AppError(400, 'VALIDATION_ERROR', 'requirements cannot be empty.');
      }
      updateData.requirements = requirements.trim();
    }

    if (status !== undefined) {
      if (!Object.values(JobStatus).includes(status)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid status value.');
      }
      updateData.status = status;
    }

    const updatedJob = await jobRepository.update(jobId, updateData);

    logger.info({
      event: 'job.update',
      correlation_id: correlationId,
      jobId: updatedJob.id,
      hrId,
    });

    return updatedJob;
  },

  async deleteJob(hrId: string, jobId: string, correlationId: string) {
    const job = await jobRepository.findById(jobId);
    if (!job) {
      throw new AppError(404, 'JOB_NOT_FOUND', `Job not found with ID: ${jobId}`);
    }

    if (job.hrId !== hrId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this job.');
    }

    const deletedJob = await jobRepository.softDelete(jobId);

    logger.info({
      event: 'job.delete',
      correlation_id: correlationId,
      jobId: deletedJob.id,
      hrId,
    });

    return deletedJob;
  },
};
