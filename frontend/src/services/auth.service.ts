import api from './api';
import { AuthResponse, User } from '@/types';

export const authService = {
  register: async (email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', { email, password, firstName, lastName });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore backend logout errors: local session must always be cleared.
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  getAccessToken: (): string | null => {
    return localStorage.getItem('accessToken');
  },
};
