import { assessmentService } from '../../src/services/assessmentService';
import AssessmentReport from '../../src/models/assessmentReport';
import { AppError } from '../../src/utils/AppError';

jest.mock('../../src/models/assessmentReport');

describe('Assessment Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getReports', () => {
    it('should return a paginated list of reports', async () => {
      const mockReports = [
        { application_id: 'app-1', session_id: 'session-1', scores: { overall: 85 } },
        { application_id: 'app-2', session_id: 'session-2', scores: { overall: 70 } },
      ];

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockReports),
      };

      (AssessmentReport.find as jest.Mock).mockReturnValue(mockFind);
      (AssessmentReport.countDocuments as jest.Mock).mockResolvedValue(10);

      const result = await assessmentService.getReports({ page: 2, limit: 2 });

      expect(AssessmentReport.find).toHaveBeenCalled();
      expect(mockFind.sort).toHaveBeenCalledWith({ generated_at: -1 });
      expect(mockFind.skip).toHaveBeenCalledWith(2); // (2-1)*2 = 2
      expect(mockFind.limit).toHaveBeenCalledWith(2);
      expect(result).toEqual({
        reports: mockReports,
        total: 10,
        page: 2,
        limit: 2,
      });
    });
  });

  describe('getReportByApplicationId', () => {
    it('should return a report if found', async () => {
      const mockReport = {
        application_id: 'app-123',
        session_id: 'session-456',
        scores: { overall: 85 },
      };

      (AssessmentReport.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockReport),
      });

      const result = await assessmentService.getReportByApplicationId('app-123');

      expect(AssessmentReport.findOne).toHaveBeenCalledWith({ application_id: 'app-123' });
      expect(result).toEqual(mockReport);
    });

    it('should throw AppError 404 if report is not found', async () => {
      (AssessmentReport.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(assessmentService.getReportByApplicationId('app-unknown')).rejects.toThrow(
        new AppError(404, 'REPORT_NOT_FOUND', 'Assessment report not found for application ID: app-unknown')
      );
    });
  });
});
