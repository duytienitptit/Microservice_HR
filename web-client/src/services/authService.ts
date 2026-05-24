import apiClient, { clearTokens, setTokens } from './apiClient';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'HR' | 'CANDIDATE';
  createdAt?: string;
  updatedAt?: string;
}

interface AuthResponseData {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface UserResponseData {
  user: User;
}

export const authService = {
  async register(fullName: string, email: string, password: string): Promise<User> {
    const response = (await apiClient.post('/auth/register', {
      email,
      password,
      fullName,
      role: 'HR', // Frontend defaults registration to HR access
    })) as any;
    return response.data.user;
  },

  async login(email: string, password: string): Promise<User> {
    const response = (await apiClient.post('/auth/login', {
      email,
      password,
    })) as any;
    const { accessToken, refreshToken, user } = response.data as AuthResponseData;
    setTokens(accessToken, refreshToken);
    return user;
  },

  async getProfile(): Promise<User> {
    const response = (await apiClient.get('/auth/me')) as any;
    return response.data.user as User;
  },

  logout(): void {
    clearTokens();
    // Dispatch session event to notify all React components of logout
    window.dispatchEvent(new Event('auth_session_expired'));
  },
};
export type { AuthResponseData, UserResponseData };
