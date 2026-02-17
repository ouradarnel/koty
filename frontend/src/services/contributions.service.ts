import api from './api';
import type { Contribution, ContributionInvitation, MemberStartMode } from '@/types';

interface CreateContributionPayload {
  name: string;
  description?: string;
  amount: number;
  currency: string;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'DELAY';
  dueDay?: number;
  deadlineDate?: string;
  firstPeriodDate?: string;
  durationPeriods?: number;
  inviteScope?: 'ALL' | 'SELECTED';
  invitedUserIds?: string[];
  invitationStartMode?: MemberStartMode;
}

interface CreateContributionInvitationPayload {
  userIds: string[];
  startMode?: MemberStartMode;
}

export const contributionsService = {
  async getContributionById(contributionId: string): Promise<Contribution> {
    const response = await api.get(`/contributions/${contributionId}`);
    return response.data;
  },

  async getBalance(contributionId: string, userId: string): Promise<{ expected: number; paid: number; balance: number }> {
    const response = await api.get(`/contributions/${contributionId}/balance/${userId}`);
    return response.data;
  },

  async createContribution(groupId: string, payload: CreateContributionPayload): Promise<Contribution> {
    const response = await api.post(`/contributions/groups/${groupId}`, payload);
    return response.data;
  },

  async inviteMembers(contributionId: string, payload: CreateContributionInvitationPayload): Promise<{
    created: number;
    skippedAlreadyMembers: number;
    skippedPending: number;
  }> {
    const response = await api.post(`/contributions/${contributionId}/invitations`, payload);
    return response.data;
  },

  async listPendingInvitations(contributionId: string): Promise<ContributionInvitation[]> {
    const response = await api.get(`/contributions/${contributionId}/invitations`);
    return response.data;
  },

  async listMyPendingInvitations(): Promise<ContributionInvitation[]> {
    const response = await api.get('/contributions/invitations/me');
    return (response.data ?? []).map(
      (
        invitation: ContributionInvitation & {
          contribution?: { name?: string; group?: { id?: string; name?: string } };
        },
      ) => ({
        ...invitation,
        contributionName: invitation.contributionName || invitation.contribution?.name,
        groupId: invitation.groupId || invitation.contribution?.group?.id,
        groupName: invitation.groupName || invitation.contribution?.group?.name,
      }),
    );
  },

  async acceptInvitation(token: string): Promise<void> {
    await api.post('/contributions/invitations/accept', { token });
  },

  async declineInvitation(invitationId: string): Promise<void> {
    await api.post(`/contributions/invitations/${invitationId}/decline`);
  },
};
