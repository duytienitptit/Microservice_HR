import apiClient from './apiClient';

export interface AssessmentReport {
  _id: string;
  application_id: string;
  session_id: string;
  candidate_name?: string;
  job_title?: string;
  scores: {
    technical: number;
    communication: number;
    relevance: number;
    overall: number;
  };
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  generated_at: string;
  reasoning?: {
    technical: string;
    communication: string;
    relevance: string;
  };
  citations?: Array<{
    quote: string;
    stage: string;
    dimension: string;
  }>;
  detailed_feedback?: string;
  scoring_method?: 'LLM' | 'RULE_BASED';
}

export const reportService = {
  /**
   * Fetches paginated reports.
   */
  async getReports(page = 1, limit = 10): Promise<{ reports: AssessmentReport[]; total: number }> {
    const params = { page, limit };
    const response = (await apiClient.get('/reports', { params })) as any;
    return {
      reports: response.data?.reports || [],
      total: response.meta?.total || 0,
    };
  },

  /**
   * Fetches the detailed assessment report by application ID.
   */
  async getReportByApplicationId(applicationId: string): Promise<AssessmentReport> {
    const response = (await apiClient.get(`/reports/${applicationId}`)) as any;
    return response.data?.report;
  },
};
