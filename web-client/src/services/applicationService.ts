import apiClient from './apiClient';

export type ApplicationStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'READY_FOR_INTERVIEW'
  | 'CV_PARSE_FAILED'
  | 'INVITED'
  | 'INTERVIEWING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'ARCHIVED';

export interface Application {
  id: string;
  jobId: string;
  cvFilePath: string;
  candidateEmail: string | null;
  candidateName: string | null;
  magicLinkToken: string | null;
  isLinkUsed: boolean;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  job?: {
    title: string;
  };
}

export const applicationService = {
  async getApplications(page = 1, limit = 10, jobId?: string, status?: string): Promise<{ applications: Application[]; total: number }> {
    const params: Record<string, any> = { page, limit };
    if (jobId) {
      params.job_id = jobId;
    }
    if (status) {
      params.status = status;
    }
    const response = (await apiClient.get('/applications', { params })) as any;
    return {
      applications: response.data?.applications || [],
      total: response.meta?.total || 0,
    };
  },

  async getApplicationById(id: string): Promise<Application> {
    const response = (await apiClient.get(`/applications/${id}`)) as any;
    return response.data.application;
  },

  async uploadCV(jobId: string, file: File, candidateName?: string, candidateEmail?: string): Promise<Application> {
    const formData = new FormData();
    formData.append('cv', file);
    formData.append('job_id', jobId);
    if (candidateName) formData.append('candidate_name', candidateName);
    if (candidateEmail) formData.append('candidate_email', candidateEmail);

    const response = (await apiClient.post('/applications', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })) as any;
    return response.data.application;
  },

  async updateStatus(id: string, status: ApplicationStatus): Promise<Application> {
    const response = (await apiClient.patch(`/applications/${id}/status`, { status })) as any;
    return response.data.application;
  },

  async sendInvite(id: string, data?: { candidate_name?: string; candidate_email?: string }): Promise<Application> {
    const response = (await apiClient.post(`/applications/${id}/invite`, data)) as any;
    return response.data.application;
  },

  async deleteApplication(id: string): Promise<void> {
    await apiClient.delete(`/applications/${id}`);
  },

  async rejectApplication(id: string): Promise<Application> {
    const response = (await apiClient.post(`/applications/${id}/reject`)) as any;
    return response.data.application;
  },

  async getCvAnalysis(id: string): Promise<any> {
    const response = (await apiClient.get(`/applications/${id}/cv-analysis`)) as any;
    return response.data.analysis;
  },

  getCvFileUrl(id: string): string {
    return `/api/applications/${id}/cv-file`;
  },
};
