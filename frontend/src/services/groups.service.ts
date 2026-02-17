import api from './api';
import type { Group, GroupInvitation, GroupMember } from '@/types';

interface CreateGroupPayload {
  name: string;
  description?: string;
}

interface AddMemberPayload {
  email: string;
  role?: 'MEMBER' | 'MANAGER';
}

interface CreateInvitationPayload {
  email: string;
  role?: 'MEMBER' | 'MANAGER';
}

export const groupsService = {
  async getGroups(params?: { createdByMe?: boolean }): Promise<Group[]> {
    const response = await api.get('/groups', { params });
    return response.data;
  },

  async getGroupById(groupId: string): Promise<Group> {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },

  async createGroup(payload: CreateGroupPayload): Promise<Group> {
    const response = await api.post('/groups', payload);
    return response.data;
  },

  async addMember(groupId: string, payload: AddMemberPayload): Promise<GroupMember> {
    const response = await api.post(`/groups/${groupId}/members`, payload);
    return response.data;
  },

  async createInvitation(groupId: string, payload: CreateInvitationPayload): Promise<GroupInvitation> {
    const response = await api.post(`/groups/${groupId}/invitations`, payload);
    return response.data;
  },

  async listPendingInvitations(groupId: string): Promise<GroupInvitation[]> {
    const response = await api.get(`/groups/${groupId}/invitations`);
    return response.data;
  },

  async listMyPendingInvitations(): Promise<GroupInvitation[]> {
    const response = await api.get('/groups/invitations/me');
    return (response.data ?? []).map((invitation: GroupInvitation & { group?: { name?: string } }) => ({
      ...invitation,
      groupName: invitation.groupName || invitation.group?.name,
    }));
  },

  async acceptInvitation(token: string): Promise<GroupMember> {
    const response = await api.post('/groups/invitations/accept', { token });
    return response.data;
  },

  async declineInvitation(invitationId: string): Promise<void> {
    await api.post(`/groups/invitations/${invitationId}/decline`);
  },
};
