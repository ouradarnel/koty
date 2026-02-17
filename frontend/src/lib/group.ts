import type { Group } from '@/types';

export function getRoleInGroup(group: Group, userId?: string): 'MEMBER' | 'MANAGER' | null {
  if (!userId) return null;
  return group.members.find((member) => member.user.id === userId)?.role ?? null;
}

export function isManager(group: Group, userId?: string): boolean {
  return getRoleInGroup(group, userId) === 'MANAGER';
}
