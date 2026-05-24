import AssessmentReport from '../models/assessmentReport';
import { AppError } from '../utils/AppError';

export const assessmentService = {
  async getReports(query: { page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      AssessmentReport.find()
        .sort({ generated_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AssessmentReport.countDocuments(),
    ]);

    return {
      reports,
      total,
      page,
      limit,
    };
  },

  async getReportByApplicationId(applicationId: string) {
    const report = await AssessmentReport.findOne({ application_id: applicationId }).lean();
    if (!report) {
      throw new AppError(404, 'REPORT_NOT_FOUND', `Assessment report not found for application ID: ${applicationId}`);
    }
    return report;
  },
};
