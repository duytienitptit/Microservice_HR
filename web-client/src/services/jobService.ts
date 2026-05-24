import apiClient from './apiClient';

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  hrId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    applications: number;
  };
}

export interface CreateJobInput {
  title: string;
  description: string;
  requirements: string;
  status?: 'DRAFT' | 'OPEN' | 'CLOSED';
}

export interface UpdateJobInput {
  title?: string;
  description?: string;
  requirements?: string;
  status?: 'DRAFT' | 'OPEN' | 'CLOSED';
}

export const jobService = {
  async getJobs(page = 1, limit = 10, status?: string): Promise<{ jobs: Job[]; total: number }> {
    const params: Record<string, any> = { page, limit };
    if (status) {
      params.status = status;
    }
    const response = (await apiClient.get('/jobs', { params })) as any;
    return {
      jobs: response.data?.jobs || [],
      total: response.meta?.total || 0,
    };
  },

  async getMyJobs(page = 1, limit = 10, status?: string): Promise<{ jobs: Job[]; total: number }> {
    const params: Record<string, any> = { page, limit };
    if (status) {
      params.status = status;
    }
    const response = (await apiClient.get('/jobs/me', { params })) as any;
    return {
      jobs: response.data?.jobs || [],
      total: response.meta?.total || 0,
    };
  },

  async getJobById(id: string): Promise<Job> {
    const response = (await apiClient.get(`/jobs/${id}`)) as any;
    return response.data.job;
  },

  async createJob(data: CreateJobInput): Promise<Job> {
    const response = (await apiClient.post('/jobs', data)) as any;
    return response.data.job;
  },

  async updateJob(id: string, data: UpdateJobInput): Promise<Job> {
    const response = (await apiClient.put(`/jobs/${id}`, data)) as any;
    return response.data.job;
  },

  async deleteJob(id: string): Promise<Job> {
    const response = (await apiClient.delete(`/jobs/${id}`)) as any;
    return response.data.job;
  },
};
