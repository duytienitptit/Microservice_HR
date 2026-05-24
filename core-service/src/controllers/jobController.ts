import { Request, Response, NextFunction } from 'express';
import { jobService } from '../services/jobService';
import { AppError } from '../utils/AppError';

const getCorrelationId = (req: Request): string =>
  req.headers['x-correlation-id'] as string;

export const createJob = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hrId = req.user?.sub;
    if (!hrId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User context not found.');
    }

    const job = await jobService.createJob(hrId, req.body, getCorrelationId(req));
    res.status(201).json({
      success: true,
      data: { job },
    });
  } catch (err) {
    next(err);
  }
};

export const getJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const status = req.query.status as string;

    const result = await jobService.getJobs({ page, limit, status });
    res.status(200).json({
      success: true,
      data: { jobs: result.jobs },
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMyJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hrId = req.user?.sub;
    if (!hrId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User context not found.');
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const status = req.query.status as string;

    const result = await jobService.getMyJobs(hrId, { page, limit, status });
    res.status(200).json({
      success: true,
      data: { jobs: result.jobs },
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getJobById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const job = await jobService.getJobById(req.params.id);
    res.status(200).json({
      success: true,
      data: { job },
    });
  } catch (err) {
    next(err);
  }
};

export const updateJob = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hrId = req.user?.sub;
    if (!hrId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User context not found.');
    }

    const job = await jobService.updateJob(hrId, req.params.id, req.body, getCorrelationId(req));
    res.status(200).json({
      success: true,
      data: { job },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteJob = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hrId = req.user?.sub;
    if (!hrId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User context not found.');
    }

    const job = await jobService.deleteJob(hrId, req.params.id, getCorrelationId(req));
    res.status(200).json({
      success: true,
      data: { job },
    });
  } catch (err) {
    next(err);
  }
};
