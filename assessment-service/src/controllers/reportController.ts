import { Request, Response, NextFunction } from 'express';
import { assessmentService } from '../services/assessmentService';

export const getReportsEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const result = await assessmentService.getReports({ page, limit });

    res.status(200).json({
      success: true,
      data: { reports: result.reports },
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

export const getReportByApplicationIdEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const report = await assessmentService.getReportByApplicationId(applicationId);

    res.status(200).json({
      success: true,
      data: { report },
    });
  } catch (err) {
    next(err);
  }
};
