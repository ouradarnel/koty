export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name: string;
  isAdmin?: boolean;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  createdBy?: User;
  members: GroupMember[];
  contributions?: Contribution[];
}

export interface GroupMember {
  id: string;
  role: 'MEMBER' | 'MANAGER';
  joinedAt: string;
  startDate?: string;
  endDate?: string;
  user: User;
}

export type MemberStartMode = 'CURRENT_PERIOD' | 'NEXT_PERIOD' | 'CATCH_UP';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED' | 'EXPIRED';

export interface GroupInvitation {
  id: string;
  groupId: string;
  groupName?: string;
  invitedById?: string;
  email: string;
  role: 'MEMBER' | 'MANAGER';
  startMode: MemberStartMode;
  status: InvitationStatus;
  token?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface ContributionInvitation {
  id: string;
  contributionId: string;
  contributionName?: string;
  groupId?: string;
  groupName?: string;
  email: string;
  startMode: MemberStartMode;
  status: InvitationStatus;
  token?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface PasswordResetRequest {
  id: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  note?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  userId: string;
  user: User;
}

export interface Contribution {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'DELAY';
  durationPeriods?: number | null;
  deadlineDate?: string | null;
  dueDay: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  groupId: string;
  members?: ContributionMember[];
  periods?: Period[];
}

export interface ContributionMember {
  id: string;
  startDate: string;
  endDate?: string;
  member: GroupMember;
}

export interface Period {
  id: string;
  month: number;
  year: number;
  amount: number;
  dueDate: string;
  contributionId: string;
}

export interface Payment {
  id: string;
  amount: number;
  status: 'DECLARED' | 'APPROVED' | 'REJECTED' | 'DIRECT';
  proofUrl?: string;
  note?: string;
  createdAt: string;
  validatedAt?: string;
  validatedBy?: string;
  userId: string;
  user?: User;
  contributionId: string;
  contribution?: {
    id: string;
    name: string;
    currency: string;
  };
}

export interface ManagerPaymentNotification {
  id: string;
  amount: number;
  status: 'DECLARED';
  note?: string;
  createdAt: string;
  userId: string;
  contributionId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  contribution: {
    id: string;
    name: string;
    currency: string;
    group: {
      id: string;
      name: string;
    };
  };
}

export interface MemberPaymentUpdateNotification {
  id: string;
  amount: number;
  status: 'APPROVED' | 'REJECTED';
  note?: string;
  createdAt: string;
  validatedAt?: string;
  contributionId: string;
  contribution: {
    id: string;
    name: string;
    currency: string;
    group: {
      id: string;
      name: string;
    };
  };
}

export interface Balance {
  expected: number;
  paid: number;
  balance: number;
}

export interface ContributionWithBalance extends Contribution {
  balance: Balance;
}

export interface MemberDashboard {
  contributions: ContributionWithBalance[];
  recentPayments: Payment[];
}

export interface ManagerDashboard {
  group: Group;
  contributionsStats: ContributionStats[];
}

export interface ContributionStats {
  id: string;
  name: string;
  currency: string;
  expectedTotal: number;
  collectedTotal: number;
  deficit: number;
  pendingPayments: number;
  members: MemberBalance[];
}

export interface MemberBalance {
  user: User;
  balance: Balance;
}
