import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/authService';
import type { User } from '../services/authService';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../services/apiClient';
import axios from 'axios';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to decode JWT exp claim
const getTokenRemainingTime = (token: string): number => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return 0;
    
    // Remaining time in milliseconds
    return payload.exp * 1000 - Date.now();
  } catch (e) {
    return 0;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const refreshTimeoutRef = useRef<number | null>(null);

  // Proactive Token Refresh Scheduler
  const scheduleTokenRefresh = useCallback((accessToken: string) => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    const remainingTime = getTokenRemainingTime(accessToken);
    // Refresh 1 minute before expiry. If already expired or close to it, refresh in 2 seconds.
    const refreshDelay = Math.max(2000, remainingTime - 60000);

    const timeoutId = window.setTimeout(async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return;
      try {
        const response = await axios.post('/api/auth/refresh', { refreshToken });
        const { accessToken: newAccess, refreshToken: newRefresh } = response.data.data;
        setTokens(newAccess, newRefresh);
        scheduleTokenRefresh(newAccess);
      } catch (err) {
        console.error('Proactive token refresh failed:', err);
        handleLogout();
      }
    }, refreshDelay);

    refreshTimeoutRef.current = timeoutId;
  }, []);

  const initAuth = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const profile = await authService.getProfile();
      setUser(profile);
      scheduleTokenRefresh(token);
    } catch (err) {
      console.error('Failed to restore session:', err);
      clearTokens();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();

    const handleSessionExpired = () => {
      handleLogout();
    };

    window.addEventListener('auth_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth_session_expired', handleSessionExpired);
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const loggedUser = await authService.login(email, password);
      setUser(loggedUser);
      const token = getAccessToken();
      if (token) {
        scheduleTokenRefresh(token);
      }
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string) => {
    setLoading(true);
    try {
      await authService.register(fullName, email, password);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = useCallback(() => {
    clearTokens();
    setUser(null);
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  const logout = () => {
    authService.logout();
    handleLogout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
