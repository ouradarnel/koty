import api from './api';
import type { PasswordResetRequest } from '@/types';

export interface AdminUserAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
}

export const usersService = {
  async listAdminAccounts(): Promise<AdminUserAccount[]> {
    const response = await api.get('/users/admin/accounts');
    return response.data;
  },

  async adminResetPassword(userId: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post('/users/admin/reset-password', { userId, newPassword });
    return response.data;
  },

  async adminResetPasswordFromRequest(userId: string, newPassword: string, requestId: string): Promise<{ message: string }> {
    const response = await api.post('/users/admin/reset-password', { userId, newPassword, requestId });
    return response.data;
  },

  async requestPasswordReset(email: string, note?: string): Promise<{ message: string }> {
    const response = await api.post('/users/password-reset-requests', { email, note });
    return response.data;
  },

  async listPendingPasswordResetRequests(): Promise<PasswordResetRequest[]> {
    const response = await api.get('/users/admin/password-reset-requests');
    return response.data;
  },

  async rejectPasswordResetRequest(requestId: string): Promise<{ message: string }> {
    const response = await api.post(`/users/admin/password-reset-requests/${requestId}/reject`);
    return response.data;
  },
};
