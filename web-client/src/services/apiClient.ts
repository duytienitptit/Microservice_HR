import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export const getAccessToken = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Bearer Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Set a random or custom Correlation ID for frontend tracing
    if (config.headers && !config.headers['X-Correlation-ID']) {
      const correlationId = 'web-' + Math.random().toString(36).substring(2, 15);
      config.headers['X-Correlation-ID'] = correlationId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Unpack data and handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => {
    // Return the response data (envelope contains success and data/meta)
    return response.data;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response) {
      // Network error or server unreachable
      return Promise.reject({
        code: 'NETWORK_ERROR',
        message: 'Cannot connect to the server. Please check your internet connection.',
      });
    }

    const { status, data } = error.response;

    // If 401 error and not retrying yet, try refreshing the token
    if (status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
      if (isRefreshing) {
        // Queue this request while token is refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        isRefreshing = false;
        // Trigger a custom logout redirect if auth provider listener is active
        window.dispatchEvent(new Event('auth_session_expired'));
        return Promise.reject(
          data?.error || {
            code: 'UNAUTHORIZED',
            message: 'Session expired. Please log in again.',
          }
        );
      }

      try {
        // Direct call without interceptors to avoid loops
        const refreshResponse = await axios.post('/api/auth/refresh', { refreshToken });
        const { accessToken: newAccess, refreshToken: newRefresh } = refreshResponse.data.data;
        
        setTokens(newAccess, newRefresh);
        isRefreshing = false;
        processQueue(null, newAccess);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearTokens();
        isRefreshing = false;
        processQueue(refreshError, null);
        window.dispatchEvent(new Event('auth_session_expired'));
        return Promise.reject({
          code: 'UNAUTHORIZED',
          message: 'Session expired. Please log in again.',
        });
      }
    }

    // Extract detailed error envelope from backend
    if (data && data.error) {
      return Promise.reject(data.error);
    }

    return Promise.reject({
      code: 'SERVER_ERROR',
      message: error.message || 'An unexpected error occurred.',
    });
  }
);

export default apiClient;
export type { ApiErrorResponse };
