import api from './api';
import type { ManagerDashboard, MemberDashboard } from '@/types';

export const dashboardService = {
  async getMemberDashboard(groupId: string): Promise<MemberDashboard> {
    const response = await api.get(`/dashboard/groups/${groupId}/member`);
    return response.data;
  },

  async getManagerDashboard(groupId: string): Promise<ManagerDashboard> {
    const response = await api.get(`/dashboard/groups/${groupId}/manager`);
    return response.data;
  },
};
