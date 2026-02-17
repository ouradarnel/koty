import api from './api';
import type { MemberPaymentUpdateNotification, ManagerPaymentNotification, Payment } from '@/types';
import { emitNotificationsRefresh } from '@/lib/notifications';

interface DeclarePaymentPayload {
  amount: number;
  proofUrl?: string;
  note?: string;
}

interface DirectPaymentPayload {
  userId: string;
  amount: number;
  note?: string;
}

export const paymentsService = {
  async declarePayment(contributionId: string, payload: DeclarePaymentPayload): Promise<Payment> {
    const response = await api.post(`/payments/contributions/${contributionId}/declare`, payload);
    emitNotificationsRefresh();
    return response.data;
  },

  async directPayment(contributionId: string, payload: DirectPaymentPayload): Promise<Payment> {
    const response = await api.post(`/payments/contributions/${contributionId}/direct`, payload);
    return response.data;
  },

  async validatePayment(paymentId: string, approve: boolean): Promise<Payment> {
    const response = await api.patch(`/payments/${paymentId}/validate`, { approve });
    emitNotificationsRefresh();
    return response.data;
  },

  async listPendingPayments(contributionId: string): Promise<Payment[]> {
    const response = await api.get(`/payments/contributions/${contributionId}/pending`);
    return response.data;
  },

  async listUserPayments(contributionId: string, userId: string): Promise<Payment[]> {
    const response = await api.get(`/payments/contributions/${contributionId}/user/${userId}`);
    return response.data;
  },

  async listManagerPendingNotifications(): Promise<ManagerPaymentNotification[]> {
    const response = await api.get('/payments/notifications/manager-pending');
    return response.data ?? [];
  },

  async listMyPaymentUpdates(since?: string): Promise<MemberPaymentUpdateNotification[]> {
    const response = await api.get('/payments/notifications/my-updates', {
      params: since ? { since } : undefined,
    });
    return response.data ?? [];
  },
};
