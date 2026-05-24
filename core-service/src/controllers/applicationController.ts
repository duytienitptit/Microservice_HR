import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils/AppError';
import { config } from '../config';
import { applicationService } from '../services/applicationService';
import { ApplicationStatus } from '@prisma/client';
import fs from 'fs';

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = config.storage.cvPath;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop() || 'pdf';
    cb(null, `${uuidv4()}.${ext}`);
  },
});

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new AppError(400, 'INVALID_FILE_TYPE', 'Only PDF files are allowed.'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const getCorrelationId = (req: Request): string =>
  (req.headers['x-correlation-id'] as string) || uuidv4();

export const uploadCvEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hrId = req.user?.sub;
    if (!hrId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User context not found.');
    }

    if (!req.file) {
      throw new AppError(400, 'MISSING_FILE', 'CV file is required.');
    }

    const { job_id, candidate_name, candidate_email } = req.body;

    if (!job_id) {
      // Clean up uploaded file if validation fails
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      throw new AppError(400, 'VALIDATION_ERROR', 'job_id is required.');
    }

    const application = await applicationService.uploadCV(
      hrId,
      job_id,
      req.file,
      candidate_name,
      candidate_email,
      getCorrelationId(req)
    );

    res.status(201).json({
      success: true,
      data: { application },
    });
  } catch (err) {
    // Clean up uploaded file if service level creation fails
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

export const getApplicationsEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hrId = req.user?.sub;
    const jobId = req.query.job_id as string;
    const status = req.query.status as string;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const result = await applicationService.getApplications({ hrId, jobId, status, page, limit });

    res.status(200).json({
      success: true,
      data: { applications: result.applications },
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

export const getApplicationByIdEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const application = await applicationService.getApplicationById(req.params.id);
    
    res.status(200).json({
      success: true,
      data: { application },
    });
  } catch (err) {
    next(err);
  }
};

export const updateStatusEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hrId = req.user?.sub;
    if (!hrId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User context not found.');
    }

    const { status } = req.body;
    if (!status) {
      throw new AppError(400, 'VALIDATION_ERROR', 'status is required.');
    }

    if (!Object.values(ApplicationStatus).includes(status)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid status value.');
    }

    const application = await applicationService.updateStatus(
      hrId,
      req.params.id,
      status as ApplicationStatus,
      getCorrelationId(req)
    );

    res.status(200).json({
      success: true,
      data: { application },
    });
  } catch (err) {
    next(err);
  }
};

export const sendInviteEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hrId = req.user?.sub;
    if (!hrId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User context not found.');
    }

    const { candidate_name, candidate_email } = req.body || {};
    const overrideData = (candidate_name || candidate_email)
      ? { candidateName: candidate_name, candidateEmail: candidate_email }
      : undefined;

    const application = await applicationService.sendInvite(
      hrId,
      req.params.id,
      getCorrelationId(req),
      overrideData
    );

    res.status(200).json({
      success: true,
      data: { application },
    });
  } catch (err) {
    next(err);
  }
};

export const getCvFileEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hrId = req.user?.sub;
    if (!hrId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User context not found.');
    }

    const filePath = await applicationService.getCvFile(
      hrId,
      req.params.id,
      getCorrelationId(req)
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="cv.pdf"');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      next(new AppError(500, 'FILE_READ_ERROR', 'Failed to read CV file.'));
    });
  } catch (err) {
    next(err);
  }
};

export const getCvAnalysisEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hrId = req.user?.sub;
    if (!hrId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User context not found.');
    }

    const analysis = await applicationService.getCvAnalysis(
      hrId,
      req.params.id,
      getCorrelationId(req)
    );

    res.status(200).json({
      success: true,
      data: { analysis },
    });
  } catch (err) {
    next(err);
  }
};

export const rejectEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hrId = req.user?.sub;
    if (!hrId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User context not found.');
    }

    const application = await applicationService.rejectApplication(
      hrId,
      req.params.id,
      getCorrelationId(req)
    );

    res.status(200).json({
      success: true,
      data: { application },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteApplicationEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hrId = req.user?.sub;
    if (!hrId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User context not found.');
    }

    await applicationService.deleteApplication(
      hrId,
      req.params.id,
      getCorrelationId(req)
    );

    res.status(200).json({
      success: true,
      data: { message: 'Application deleted successfully.' },
    });
  } catch (err) {
    next(err);
  }
};
