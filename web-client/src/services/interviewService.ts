import axios from 'axios';
import apiClient from './apiClient';

// Public client for unauthenticated endpoints (magic link validation)
const publicClient = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

export type InterviewStage =
  | 'GREETING'
  | 'EXPERIENCE_REVIEW'
  | 'TECHNICAL_QUESTIONS'
  | 'SCENARIO_QUESTIONS'
  | 'CLOSING';

export type InterviewStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface InterviewSession {
  id: string;
  application_id: string;
  status: InterviewStatus;
  current_stage: InterviewStage;
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'AI' | 'CANDIDATE';
  content: string;
  stage: InterviewStage;
  created_at: string;
}

export interface ValidateTokenResponse {
  session: InterviewSession;
  messages: ChatMessage[];
  candidate_name: string;
  job_title: string;
}

export interface ChatResponse {
  session: InterviewSession;
  candidate_message: ChatMessage;
  ai_response: ChatMessage | null;
  interview_ended: boolean;
}

export const interviewService = {
  /**
   * Validates the magic link token and starts or resumes the interview session.
   * Uses raw axios with /api/interview prefix — Nginx proxies to AI Service.
   */
  async validateMagicLink(token: string): Promise<ValidateTokenResponse> {
    const correlationId = 'web-' + Math.random().toString(36).substring(2, 15);
    const response = await publicClient.get(`/api/interview/${token}`, {
      headers: { 'X-Correlation-ID': correlationId },
    });
    
    // axios returns response.data which holds { success, data }
    if (response.data && response.data.success) {
      return response.data.data;
    }
    
    throw new Error(response.data?.error?.message || 'Failed to validate magic link.');
  },

  /**
   * Retrieves the interview session details.
   */
  async getSession(sessionId: string): Promise<InterviewSession> {
    const response = (await apiClient.get(`/interviews/${sessionId}`)) as any;
    return response.data;
  },

  /**
   * Sends a message to the AI interviewer and receives the response.
   */
  async sendMessage(sessionId: string, message: string): Promise<ChatResponse> {
    const response = (await apiClient.post(`/interviews/${sessionId}/chat`, { message })) as any;
    return response.data;
  },

  /**
   * Fetches the full chat transcript history.
   */
  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    const response = (await apiClient.get(`/interviews/${sessionId}/history`)) as any;
    return response.data?.messages || [];
  },

  /**
   * Manually ends the interview session.
   */
  async endInterview(sessionId: string): Promise<InterviewSession> {
    const response = (await apiClient.post(`/interviews/${sessionId}/end`)) as any;
    return response.data;
  },
};
