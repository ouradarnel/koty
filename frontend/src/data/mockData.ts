import { Balance, Contribution, ContributionStats, Group, GroupInvitation, GroupMember, MemberBalance, MemberStartMode, Payment, User } from '@/types';

const users: User[] = [
  { id: 'u-admin', email: 'admin@local.dev', name: 'admin' },
  { id: 'u-user', email: 'user@local.dev', name: 'user' },
  { id: 'u-marie', email: 'marie@local.dev', name: 'Marie' },
  { id: 'u-samir', email: 'samir@local.dev', name: 'Samir' },
];

const groupMembers: Record<string, GroupMember> = {
  gm_admin_famille: {
    id: 'gm_admin_famille',
    role: 'MANAGER',
    joinedAt: '2026-01-01T00:00:00.000Z',
    user: users[0],
  },
  gm_user_famille: {
    id: 'gm_user_famille',
    role: 'MEMBER',
    joinedAt: '2026-01-01T00:00:00.000Z',
    user: users[1],
  },
  gm_marie_famille: {
    id: 'gm_marie_famille',
    role: 'MEMBER',
    joinedAt: '2026-02-01T00:00:00.000Z',
    user: users[2],
  },
  gm_admin_voyage: {
    id: 'gm_admin_voyage',
    role: 'MANAGER',
    joinedAt: '2026-01-10T00:00:00.000Z',
    user: users[0],
  },
  gm_user_voyage: {
    id: 'gm_user_voyage',
    role: 'MEMBER',
    joinedAt: '2026-01-10T00:00:00.000Z',
    user: users[1],
  },
  gm_samir_voyage: {
    id: 'gm_samir_voyage',
    role: 'MEMBER',
    joinedAt: '2026-01-10T00:00:00.000Z',
    user: users[3],
  },
};

const contributions: Contribution[] = [
  {
    id: 'c_famille_mensuelle',
    name: 'Cotisation Mensuelle',
    description: 'Budget vie commune',
    amount: 50,
    currency: 'EUR',
    frequency: 'MONTHLY',
    dueDay: 5,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-02-16T00:00:00.000Z',
    groupId: 'g_famille',
    members: [
      { id: 'cm_1', startDate: '2026-01-01T00:00:00.000Z', member: groupMembers.gm_admin_famille },
      { id: 'cm_2', startDate: '2026-01-01T00:00:00.000Z', member: groupMembers.gm_user_famille },
      { id: 'cm_3', startDate: '2026-02-01T00:00:00.000Z', member: groupMembers.gm_marie_famille },
    ],
    periods: [
      {
        id: 'p_c1_2026_01',
        month: 1,
        year: 2026,
        amount: 50,
        dueDate: '2026-01-05T00:00:00.000Z',
        contributionId: 'c_famille_mensuelle',
      },
      {
        id: 'p_c1_2026_02',
        month: 2,
        year: 2026,
        amount: 50,
        dueDate: '2026-02-05T00:00:00.000Z',
        contributionId: 'c_famille_mensuelle',
      },
      {
        id: 'p_c1_2026_03',
        month: 3,
        year: 2026,
        amount: 50,
        dueDate: '2026-03-05T00:00:00.000Z',
        contributionId: 'c_famille_mensuelle',
      },
    ],
  },
  {
    id: 'c_famille_urgence',
    name: 'Caisse Urgence',
    description: 'Dépenses imprévues',
    amount: 20,
    currency: 'EUR',
    frequency: 'MONTHLY',
    dueDay: 15,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-02-16T00:00:00.000Z',
    groupId: 'g_famille',
    members: [
      { id: 'cm_4', startDate: '2026-01-01T00:00:00.000Z', member: groupMembers.gm_admin_famille },
      { id: 'cm_5', startDate: '2026-01-01T00:00:00.000Z', member: groupMembers.gm_user_famille },
    ],
    periods: [
      {
        id: 'p_c2_2026_01',
        month: 1,
        year: 2026,
        amount: 20,
        dueDate: '2026-01-15T00:00:00.000Z',
        contributionId: 'c_famille_urgence',
      },
      {
        id: 'p_c2_2026_02',
        month: 2,
        year: 2026,
        amount: 20,
        dueDate: '2026-02-15T00:00:00.000Z',
        contributionId: 'c_famille_urgence',
      },
    ],
  },
  {
    id: 'c_voyage_principale',
    name: 'Projet Voyage',
    description: 'Objectif été 2026',
    amount: 100,
    currency: 'USD',
    frequency: 'MONTHLY',
    dueDay: 10,
    isActive: true,
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-02-16T00:00:00.000Z',
    groupId: 'g_voyage',
    members: [
      { id: 'cm_6', startDate: '2026-01-10T00:00:00.000Z', member: groupMembers.gm_admin_voyage },
      { id: 'cm_7', startDate: '2026-01-10T00:00:00.000Z', member: groupMembers.gm_user_voyage },
      { id: 'cm_8', startDate: '2026-01-10T00:00:00.000Z', member: groupMembers.gm_samir_voyage },
    ],
    periods: [
      {
        id: 'p_c3_2026_01',
        month: 1,
        year: 2026,
        amount: 100,
        dueDate: '2026-01-10T00:00:00.000Z',
        contributionId: 'c_voyage_principale',
      },
      {
        id: 'p_c3_2026_02',
        month: 2,
        year: 2026,
        amount: 100,
        dueDate: '2026-02-10T00:00:00.000Z',
        contributionId: 'c_voyage_principale',
      },
    ],
  },
];

const groups: Group[] = [
  {
    id: 'g_famille',
    name: 'Tontine Famille 2026',
    description: 'Gestion des dépenses familiales',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-02-16T00:00:00.000Z',
    members: [groupMembers.gm_admin_famille, groupMembers.gm_user_famille, groupMembers.gm_marie_famille],
    contributions: contributions.filter((c) => c.groupId === 'g_famille'),
  },
  {
    id: 'g_voyage',
    name: 'Voyage Été 2026',
    description: 'Objectif budget vacances',
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-02-16T00:00:00.000Z',
    members: [groupMembers.gm_admin_voyage, groupMembers.gm_user_voyage, groupMembers.gm_samir_voyage],
    contributions: contributions.filter((c) => c.groupId === 'g_voyage'),
  },
];

const payments: Payment[] = [
  {
    id: 'pay_1',
    amount: 50,
    status: 'APPROVED',
    note: 'Janvier',
    createdAt: '2026-01-04T10:00:00.000Z',
    validatedAt: '2026-01-04T11:00:00.000Z',
    validatedBy: users[0].id,
    userId: users[1].id,
    contributionId: 'c_famille_mensuelle',
  },
  {
    id: 'pay_2',
    amount: 50,
    status: 'APPROVED',
    note: 'Février',
    createdAt: '2026-02-04T10:00:00.000Z',
    validatedAt: '2026-02-04T12:00:00.000Z',
    validatedBy: users[0].id,
    userId: users[1].id,
    contributionId: 'c_famille_mensuelle',
  },
  {
    id: 'pay_3',
    amount: 100,
    status: 'DIRECT',
    note: 'Paiement enregistré par le gestionnaire',
    createdAt: '2026-02-15T09:00:00.000Z',
    validatedAt: '2026-02-15T09:00:00.000Z',
    validatedBy: users[0].id,
    userId: users[0].id,
    contributionId: 'c_famille_mensuelle',
  },
  {
    id: 'pay_4',
    amount: 50,
    status: 'DECLARED',
    note: 'Virement mobile',
    createdAt: '2026-02-16T14:00:00.000Z',
    userId: users[2].id,
    contributionId: 'c_famille_mensuelle',
  },
  {
    id: 'pay_5',
    amount: 20,
    status: 'APPROVED',
    note: 'Urgence Jan',
    createdAt: '2026-01-15T08:00:00.000Z',
    validatedAt: '2026-01-15T10:00:00.000Z',
    validatedBy: users[0].id,
    userId: users[1].id,
    contributionId: 'c_famille_urgence',
  },
  {
    id: 'pay_6',
    amount: 20,
    status: 'DECLARED',
    note: 'Urgence Février',
    createdAt: '2026-02-15T10:30:00.000Z',
    userId: users[1].id,
    contributionId: 'c_famille_urgence',
  },
  {
    id: 'pay_7',
    amount: 200,
    status: 'APPROVED',
    note: 'Avance 2 mois',
    createdAt: '2026-01-09T09:00:00.000Z',
    validatedAt: '2026-01-09T11:00:00.000Z',
    validatedBy: users[0].id,
    userId: users[1].id,
    contributionId: 'c_voyage_principale',
  },
  {
    id: 'pay_8',
    amount: 100,
    status: 'DIRECT',
    note: 'Enregistré en caisse',
    createdAt: '2026-02-11T09:00:00.000Z',
    validatedAt: '2026-02-11T09:00:00.000Z',
    validatedBy: users[0].id,
    userId: users[3].id,
    contributionId: 'c_voyage_principale',
  },
];

const groupInvitations: GroupInvitation[] = [];

function notifyMockDataUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mockDataUpdated'));
  }
}

export function getCurrentUserFromStorage(): User {
  const raw = localStorage.getItem('user');
  if (!raw) return users[1];
  try {
    const parsed = JSON.parse(raw) as User;
    return users.find((u) => u.id === parsed.id || u.email === parsed.email) ?? users[1];
  } catch {
    return users[1];
  }
}

export function getGroupsForUser(userId: string): Group[] {
  return groups.filter((g) => g.members.some((m) => m.user.id === userId));
}

export function createGroupForUser(userId: string, name: string, description?: string): Group {
  const user = users.find((u) => u.id === userId);
  if (!user) {
    throw new Error('Utilisateur introuvable');
  }

  const now = new Date().toISOString();
  const groupId = `g_${Date.now()}`;
  const memberId = `gm_${Date.now()}`;
  const group: Group = {
    id: groupId,
    name,
    description: description || '',
    createdAt: now,
    updatedAt: now,
    createdById: user.id,
    createdBy: user,
    members: [
      {
        id: memberId,
        role: 'MANAGER',
        joinedAt: now,
        user,
      },
    ],
    contributions: [],
  };

  groups.unshift(group);
  notifyMockDataUpdated();
  return group;
}

function buildDueDate(year: number, month: number, dueDay: number): string {
  const maxDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(dueDay, maxDay);
  return new Date(year, month - 1, safeDay).toISOString();
}

function computeMembershipStartDate(startMode: MemberStartMode, groupCreatedAt?: string): string {
  const now = new Date();
  if (startMode === 'CURRENT_PERIOD') {
    return now.toISOString();
  }
  if (startMode === 'CATCH_UP') {
    return groupCreatedAt ?? new Date(1970, 0, 1).toISOString();
  }
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const month = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
  return new Date(year, month, 1).toISOString();
}

function computeContributionStartDate(dueDay: number, startMode: MemberStartMode, groupCreatedAt?: string): string {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  if (startMode === 'CURRENT_PERIOD') {
    return buildDueDate(currentYear, currentMonth, dueDay);
  }
  if (startMode === 'CATCH_UP') {
    const catchUpStart = groupCreatedAt ? new Date(groupCreatedAt) : new Date(1970, 0, 1);
    return buildDueDate(catchUpStart.getFullYear(), catchUpStart.getMonth() + 1, dueDay);
  }
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
  return buildDueDate(nextYear, nextMonth, dueDay);
}

export function addMemberToGroup(
  groupId: string,
  managerUserId: string,
  email: string,
  role: GroupMember['role'] = 'MEMBER',
  startMode: MemberStartMode = 'NEXT_PERIOD',
): GroupMember {
  const group = getGroupById(groupId);
  if (!group) {
    throw new Error('Groupe introuvable');
  }

  if (!isManager(group, managerUserId)) {
    throw new Error('Seul un gestionnaire peut ajouter un membre');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email requis');
  }

  const targetUser = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!targetUser) {
    throw new Error('Utilisateur introuvable');
  }

  const member = addMemberToGroupInternal(group, targetUser, role, startMode);
  notifyMockDataUpdated();
  return member;
}

function addMemberToGroupInternal(
  group: Group,
  targetUser: User,
  role: GroupMember['role'],
  startMode: MemberStartMode,
): GroupMember {
  const existing = group.members.find((member) => member.user.id === targetUser.id && !member.endDate);
  if (existing) {
    throw new Error('Cet utilisateur est déjà membre du groupe');
  }

  const now = new Date().toISOString();
  const member: GroupMember = {
    id: `gm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role,
    joinedAt: now,
    startDate: computeMembershipStartDate(startMode, group.createdAt),
    user: targetUser,
  };

  group.members.push(member);

  (group.contributions ?? []).forEach((contribution) => {
    contribution.members = contribution.members ?? [];
    contribution.members.push({
      id: `cm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      startDate: computeContributionStartDate(contribution.dueDay, startMode, group.createdAt),
      member,
    });
  });

  group.updatedAt = now;
  return member;
}

export function createGroupInvitation(
  groupId: string,
  managerUserId: string,
  email: string,
  role: GroupMember['role'] = 'MEMBER',
  startMode: MemberStartMode = 'NEXT_PERIOD',
): GroupInvitation {
  const group = getGroupById(groupId);
  if (!group) {
    throw new Error('Groupe introuvable');
  }

  if (!isManager(group, managerUserId)) {
    throw new Error('Seul un gestionnaire peut inviter un membre');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email requis');
  }

  const targetUser = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!targetUser) {
    throw new Error('Utilisateur introuvable');
  }

  const alreadyMember = group.members.find((member) => member.user.id === targetUser.id && !member.endDate);
  if (alreadyMember) {
    throw new Error('Cet utilisateur est déjà membre du groupe');
  }

  const pending = groupInvitations.find(
    (inv) =>
      inv.groupId === groupId &&
      inv.email.toLowerCase() === normalizedEmail &&
      inv.status === 'PENDING',
  );
  if (pending) {
    throw new Error('Une invitation est déjà en attente pour cet utilisateur');
  }

  const now = new Date().toISOString();
  const invitation: GroupInvitation = {
    id: `ginv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    groupId,
    groupName: group.name,
    invitedById: managerUserId,
    email: normalizedEmail,
    role,
    startMode,
    status: 'PENDING',
    createdAt: now,
  };

  groupInvitations.unshift(invitation);
  notifyMockDataUpdated();
  return invitation;
}

export function getPendingInvitationsForGroup(groupId: string): GroupInvitation[] {
  return groupInvitations.filter((inv) => inv.groupId === groupId && inv.status === 'PENDING');
}

export function getPendingInvitationsForUser(userId: string): GroupInvitation[] {
  const user = users.find((u) => u.id === userId);
  if (!user) return [];
  const email = user.email.toLowerCase();
  return groupInvitations.filter((inv) => inv.email.toLowerCase() === email && inv.status === 'PENDING');
}

export function acceptGroupInvitation(invitationId: string, userId: string): GroupMember {
  const invitation = groupInvitations.find((inv) => inv.id === invitationId);
  if (!invitation || invitation.status !== 'PENDING') {
    throw new Error('Invitation introuvable ou déjà traitée');
  }

  const user = users.find((u) => u.id === userId);
  if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error("Cette invitation n'appartient pas à cet utilisateur");
  }

  const group = getGroupById(invitation.groupId);
  if (!group) {
    throw new Error('Groupe introuvable');
  }

  const member = addMemberToGroupInternal(group, user, invitation.role, invitation.startMode);
  invitation.status = 'ACCEPTED';
  notifyMockDataUpdated();
  return member;
}

export function declineGroupInvitation(invitationId: string, userId: string): GroupInvitation {
  const invitation = groupInvitations.find((inv) => inv.id === invitationId);
  if (!invitation || invitation.status !== 'PENDING') {
    throw new Error('Invitation introuvable ou déjà traitée');
  }

  const user = users.find((u) => u.id === userId);
  if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error("Cette invitation n'appartient pas à cet utilisateur");
  }

  invitation.status = 'DECLINED';
  notifyMockDataUpdated();
  return invitation;
}

export function getGroupById(groupId: string): Group | undefined {
  return groups.find((g) => g.id === groupId);
}

export function getContributionById(contributionId: string): Contribution | undefined {
  return contributions.find((c) => c.id === contributionId);
}

export function getGroupForContribution(contributionId: string): Group | undefined {
  const contribution = getContributionById(contributionId);
  return contribution ? getGroupById(contribution.groupId) : undefined;
}

export function getPaymentsForContribution(contributionId: string): Payment[] {
  return payments.filter((p) => p.contributionId === contributionId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getDuePeriods(contribution: Contribution): NonNullable<Contribution['periods']> {
  const now = new Date();
  return (contribution.periods ?? []).filter((p) => new Date(p.dueDate) <= now);
}

export function calculateBalanceForMember(
  contribution: Contribution,
  userId: string,
  sourcePayments: Payment[] = payments,
): Balance {
  const membership = (contribution.members ?? []).find((m) => m.member.user.id === userId);
  if (!membership) {
    return { expected: 0, paid: 0, balance: 0 };
  }

  const startDate = new Date(membership.startDate);
  const endDate = membership.endDate ? new Date(membership.endDate) : null;
  const duePeriods = getDuePeriods(contribution);
  const expected = duePeriods
    .filter((p) => {
      const due = new Date(p.dueDate);
      return due >= startDate && (!endDate || due <= endDate);
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const paid = sourcePayments
    .filter(
      (p) =>
        p.contributionId === contribution.id &&
        p.userId === userId &&
        (p.status === 'APPROVED' || p.status === 'DIRECT'),
    )
    .reduce((sum, p) => sum + p.amount, 0);

  return { expected, paid, balance: paid - expected };
}

export function getContributionStats(contribution: Contribution, sourcePayments: Payment[] = payments): ContributionStats {
  const duePeriods = getDuePeriods(contribution);
  const members = contribution.members ?? [];

  const expectedTotal = duePeriods.reduce((acc, period) => {
    const membersActive = members.filter((m) => {
      const start = new Date(m.startDate);
      const due = new Date(period.dueDate);
      const end = m.endDate ? new Date(m.endDate) : null;
      return start <= due && (!end || due <= end);
    });
    return acc + membersActive.length * period.amount;
  }, 0);

  const collectedTotal = sourcePayments
    .filter((p) => p.contributionId === contribution.id && (p.status === 'APPROVED' || p.status === 'DIRECT'))
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingPayments = sourcePayments.filter(
    (p) => p.contributionId === contribution.id && p.status === 'DECLARED',
  ).length;

  const memberBalances: MemberBalance[] = members.map((m) => ({
    user: m.member.user,
    balance: calculateBalanceForMember(contribution, m.member.user.id, sourcePayments),
  }));

  return {
    id: contribution.id,
    name: contribution.name,
    currency: contribution.currency,
    expectedTotal,
    collectedTotal,
    deficit: expectedTotal - collectedTotal,
    pendingPayments,
    members: memberBalances,
  };
}

export function getRoleInGroup(group: Group, userId: string): GroupMember['role'] | null {
  return group.members.find((m) => m.user.id === userId)?.role ?? null;
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}

export function enrichPayments(sourcePayments: Payment[]): Payment[] {
  return sourcePayments.map((p) => {
    const contribution = getContributionById(p.contributionId);
    return {
      ...p,
      user: users.find((u) => u.id === p.userId),
      contribution: contribution
        ? {
            id: contribution.id,
            name: contribution.name,
            currency: contribution.currency,
          }
        : undefined,
    };
  });
}

export function isManager(group: Group, userId: string): boolean {
  return getRoleInGroup(group, userId) === 'MANAGER';
}

export function statusLabel(status: Payment['status']): string {
  if (status === 'DECLARED') return 'Déclaré';
  if (status === 'APPROVED') return 'Validé';
  if (status === 'REJECTED') return 'Refusé';
  return 'Direct';
}
