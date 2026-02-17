import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import {
  Contribution,
  Frequency,
  Group,
  GroupMember,
  InvitationStatus,
  MemberStartMode,
  PaymentStatus,
  PrismaClient,
  Role,
  User,
} from '@prisma/client';

const prisma = new PrismaClient();

type EnsureUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  isAdmin?: boolean;
};

type EnsureGroupInput = {
  name: string;
  description: string;
  createdById: string;
};

type EnsureGroupAliasesInput = {
  names: string[];
  preferredName: string;
  description: string;
  createdById: string;
};

type EnsureMembershipInput = {
  groupId: string;
  userId: string;
  role: Role;
  startDate: Date;
};

type EnsureContributionInput = {
  groupId: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  dueDay: number;
};

type EnsureContributionMemberInput = {
  contributionId: string;
  memberId: string;
  startDate: Date;
};

type EnsurePeriodInput = {
  contributionId: string;
  month: number;
  year: number;
  amount: number;
  dueDate: Date;
};

type EnsurePaymentInput = {
  contributionId: string;
  userId: string;
  amount: number;
  status: PaymentStatus;
  note: string;
  createdAt: Date;
  validatedBy?: string;
  validatedAt?: Date;
};

type EnsureInvitationInput = {
  groupId: string;
  invitedById: string;
  email: string;
  role: Role;
  startMode: MemberStartMode;
};

async function ensureUser(input: EnsureUserInput): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  const normalizedName = `${input.firstName} ${input.lastName}`.trim();
  if (existing) {
    if (
      existing.firstName !== input.firstName ||
      existing.lastName !== input.lastName ||
      existing.name !== normalizedName ||
      existing.isAdmin !== (input.isAdmin ?? false)
    ) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          name: normalizedName,
          isAdmin: input.isAdmin ?? false,
        },
      });
    }
    return existing;
  }

  const hash = await bcrypt.hash(input.password, 10);
  return prisma.user.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      name: normalizedName,
      password: hash,
      isAdmin: input.isAdmin ?? false,
    },
  });
}

async function ensureGroup(input: EnsureGroupInput): Promise<Group> {
  const existing = await prisma.group.findFirst({
    where: {
      name: input.name,
      createdById: input.createdById,
    },
  });

  if (existing) return existing;

  return prisma.group.create({
    data: {
      name: input.name,
      description: input.description,
      createdById: input.createdById,
    },
  });
}

async function ensureGroupByAliases(input: EnsureGroupAliasesInput): Promise<Group> {
  const existing = await prisma.group.findFirst({
    where: {
      createdById: input.createdById,
      name: {
        in: input.names,
      },
    },
  });

  if (existing) return existing;

  return ensureGroup({
    name: input.preferredName,
    description: input.description,
    createdById: input.createdById,
  });
}

async function ensureMembership(input: EnsureMembershipInput): Promise<GroupMember> {
  const existing = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId: input.userId,
        groupId: input.groupId,
      },
    },
  });

  if (!existing) {
    return prisma.groupMember.create({
      data: {
        groupId: input.groupId,
        userId: input.userId,
        role: input.role,
        startDate: input.startDate,
        joinedAt: input.startDate,
      },
    });
  }

  if (existing.role !== input.role || existing.endDate !== null) {
    return prisma.groupMember.update({
      where: { id: existing.id },
      data: {
        role: input.role,
        endDate: null,
      },
    });
  }

  return existing;
}

async function ensureContribution(input: EnsureContributionInput): Promise<Contribution> {
  const existing = await prisma.contribution.findFirst({
    where: {
      groupId: input.groupId,
      name: input.name,
    },
  });

  if (existing) return existing;

  return prisma.contribution.create({
    data: {
      groupId: input.groupId,
      name: input.name,
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      frequency: Frequency.MONTHLY,
      dueDay: input.dueDay,
      isActive: true,
    },
  });
}

async function ensureContributionMember(input: EnsureContributionMemberInput) {
  const existing = await prisma.contributionMember.findUnique({
    where: {
      contributionId_memberId: {
        contributionId: input.contributionId,
        memberId: input.memberId,
      },
    },
  });

  if (existing) return existing;

  return prisma.contributionMember.create({
    data: {
      contributionId: input.contributionId,
      memberId: input.memberId,
      startDate: input.startDate,
    },
  });
}

async function ensurePeriod(input: EnsurePeriodInput) {
  const existing = await prisma.period.findUnique({
    where: {
      contributionId_month_year: {
        contributionId: input.contributionId,
        month: input.month,
        year: input.year,
      },
    },
  });

  if (existing) return existing;

  return prisma.period.create({
    data: {
      contributionId: input.contributionId,
      month: input.month,
      year: input.year,
      amount: input.amount,
      dueDate: input.dueDate,
    },
  });
}

async function ensurePayment(input: EnsurePaymentInput) {
  const existing = await prisma.payment.findFirst({
    where: {
      contributionId: input.contributionId,
      userId: input.userId,
      status: input.status,
      note: input.note,
    },
  });

  if (existing) return existing;

  return prisma.payment.create({
    data: {
      contributionId: input.contributionId,
      userId: input.userId,
      amount: input.amount,
      status: input.status,
      note: input.note,
      createdAt: input.createdAt,
      validatedBy: input.validatedBy,
      validatedAt: input.validatedAt,
    },
  });
}

async function ensureInvitation(input: EnsureInvitationInput) {
  const existing = await prisma.groupInvitation.findFirst({
    where: {
      groupId: input.groupId,
      email: input.email,
      status: InvitationStatus.PENDING,
    },
  });

  if (existing) return existing;

  return prisma.groupInvitation.create({
    data: {
      groupId: input.groupId,
      invitedById: input.invitedById,
      email: input.email,
      role: input.role,
      startMode: input.startMode,
      status: InvitationStatus.PENDING,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

async function seed() {
  const admin = await ensureUser({ email: 'admin@local.dev', firstName: 'Admin', lastName: 'Local', password: 'admin123', isAdmin: true });
  const user = await ensureUser({ email: 'user@local.dev', firstName: 'User', lastName: 'Local', password: 'user123' });
  const marie = await ensureUser({ email: 'marie@local.dev', firstName: 'Marie', lastName: 'Diallo', password: 'user123' });
  const samir = await ensureUser({ email: 'samir@local.dev', firstName: 'Samir', lastName: 'Traore', password: 'user123' });

  const startCurrent = new Date('2026-01-01T00:00:00.000Z');
  const startNext = new Date('2026-02-01T00:00:00.000Z');

  const groupFamily = await ensureGroup({
    name: 'Tontine Famille 2026',
    description: 'Gestion des depenses familiales',
    createdById: admin.id,
  });

  const groupTravel = await ensureGroupByAliases({
    names: ['Projet Voyage Été', 'Projet Voyage Ete'],
    preferredName: 'Projet Voyage Été',
    description: 'Objectif budget vacances 2026',
    createdById: user.id,
  });

  const groupOffice = await ensureGroup({
    name: 'Admin - Caisse Bureau',
    description: 'Caisse interne geree par admin',
    createdById: admin.id,
  });

  const groupDistrict = await ensureGroup({
    name: 'User - Tontine Quartier',
    description: 'Tontine locale geree par user',
    createdById: user.id,
  });

  const gmAdminFamily = await ensureMembership({ groupId: groupFamily.id, userId: admin.id, role: Role.MANAGER, startDate: startCurrent });
  const gmUserFamily = await ensureMembership({ groupId: groupFamily.id, userId: user.id, role: Role.MEMBER, startDate: startCurrent });
  const gmMarieFamily = await ensureMembership({ groupId: groupFamily.id, userId: marie.id, role: Role.MEMBER, startDate: startNext });

  const gmUserTravel = await ensureMembership({ groupId: groupTravel.id, userId: user.id, role: Role.MANAGER, startDate: startCurrent });
  const gmAdminTravel = await ensureMembership({ groupId: groupTravel.id, userId: admin.id, role: Role.MEMBER, startDate: startCurrent });

  const gmAdminOffice = await ensureMembership({ groupId: groupOffice.id, userId: admin.id, role: Role.MANAGER, startDate: startNext });
  const gmUserOffice = await ensureMembership({ groupId: groupOffice.id, userId: user.id, role: Role.MEMBER, startDate: startNext });
  const gmMarieOffice = await ensureMembership({ groupId: groupOffice.id, userId: marie.id, role: Role.MEMBER, startDate: startNext });

  const gmUserDistrict = await ensureMembership({ groupId: groupDistrict.id, userId: user.id, role: Role.MANAGER, startDate: startNext });
  const gmAdminDistrict = await ensureMembership({ groupId: groupDistrict.id, userId: admin.id, role: Role.MEMBER, startDate: startNext });
  const gmSamirDistrict = await ensureMembership({ groupId: groupDistrict.id, userId: samir.id, role: Role.MEMBER, startDate: startNext });

  const cFamilyMonthly = await ensureContribution({
    groupId: groupFamily.id,
    name: 'Cotisation Mensuelle',
    description: 'Budget mensuel du foyer',
    amount: 50,
    currency: 'EUR',
    dueDay: 5,
  });

  const cFamilyEmergency = await ensureContribution({
    groupId: groupFamily.id,
    name: 'Caisse Urgence',
    description: 'Fonds imprevus',
    amount: 20,
    currency: 'EUR',
    dueDay: 15,
  });

  const cTravelMain = await ensureContribution({
    groupId: groupTravel.id,
    name: 'Projet Voyage',
    description: 'Cagnotte pour le voyage',
    amount: 100,
    currency: 'USD',
    dueDay: 10,
  });

  const cOfficeFees = await ensureContribution({
    groupId: groupOffice.id,
    name: 'Frais Bureau',
    description: 'Participation mensuelle bureau',
    amount: 35,
    currency: 'EUR',
    dueDay: 7,
  });

  const cDistrictPot = await ensureContribution({
    groupId: groupDistrict.id,
    name: 'Cagnotte Quartier',
    description: 'Participation mensuelle quartier',
    amount: 15000,
    currency: 'XOF',
    dueDay: 12,
  });

  await ensureContributionMember({ contributionId: cFamilyMonthly.id, memberId: gmAdminFamily.id, startDate: startCurrent });
  await ensureContributionMember({ contributionId: cFamilyMonthly.id, memberId: gmUserFamily.id, startDate: startCurrent });
  await ensureContributionMember({ contributionId: cFamilyMonthly.id, memberId: gmMarieFamily.id, startDate: startNext });

  await ensureContributionMember({ contributionId: cFamilyEmergency.id, memberId: gmAdminFamily.id, startDate: startCurrent });
  await ensureContributionMember({ contributionId: cFamilyEmergency.id, memberId: gmUserFamily.id, startDate: startCurrent });

  await ensureContributionMember({ contributionId: cTravelMain.id, memberId: gmUserTravel.id, startDate: startCurrent });
  await ensureContributionMember({ contributionId: cTravelMain.id, memberId: gmAdminTravel.id, startDate: startCurrent });

  await ensureContributionMember({ contributionId: cOfficeFees.id, memberId: gmAdminOffice.id, startDate: startNext });
  await ensureContributionMember({ contributionId: cOfficeFees.id, memberId: gmUserOffice.id, startDate: startNext });
  await ensureContributionMember({ contributionId: cOfficeFees.id, memberId: gmMarieOffice.id, startDate: startNext });

  await ensureContributionMember({ contributionId: cDistrictPot.id, memberId: gmUserDistrict.id, startDate: startNext });
  await ensureContributionMember({ contributionId: cDistrictPot.id, memberId: gmAdminDistrict.id, startDate: startNext });
  await ensureContributionMember({ contributionId: cDistrictPot.id, memberId: gmSamirDistrict.id, startDate: startNext });

  await ensurePeriod({ contributionId: cFamilyMonthly.id, month: 1, year: 2026, amount: 50, dueDate: new Date('2026-01-05T00:00:00.000Z') });
  await ensurePeriod({ contributionId: cFamilyMonthly.id, month: 2, year: 2026, amount: 50, dueDate: new Date('2026-02-05T00:00:00.000Z') });
  await ensurePeriod({ contributionId: cFamilyMonthly.id, month: 3, year: 2026, amount: 50, dueDate: new Date('2026-03-05T00:00:00.000Z') });

  await ensurePeriod({ contributionId: cFamilyEmergency.id, month: 1, year: 2026, amount: 20, dueDate: new Date('2026-01-15T00:00:00.000Z') });
  await ensurePeriod({ contributionId: cFamilyEmergency.id, month: 2, year: 2026, amount: 20, dueDate: new Date('2026-02-15T00:00:00.000Z') });

  await ensurePeriod({ contributionId: cTravelMain.id, month: 1, year: 2026, amount: 100, dueDate: new Date('2026-01-10T00:00:00.000Z') });
  await ensurePeriod({ contributionId: cTravelMain.id, month: 2, year: 2026, amount: 100, dueDate: new Date('2026-02-10T00:00:00.000Z') });

  await ensurePeriod({ contributionId: cOfficeFees.id, month: 2, year: 2026, amount: 35, dueDate: new Date('2026-02-07T00:00:00.000Z') });
  await ensurePeriod({ contributionId: cOfficeFees.id, month: 3, year: 2026, amount: 35, dueDate: new Date('2026-03-07T00:00:00.000Z') });

  await ensurePeriod({ contributionId: cDistrictPot.id, month: 2, year: 2026, amount: 15000, dueDate: new Date('2026-02-12T00:00:00.000Z') });
  await ensurePeriod({ contributionId: cDistrictPot.id, month: 3, year: 2026, amount: 15000, dueDate: new Date('2026-03-12T00:00:00.000Z') });

  await ensurePayment({
    contributionId: cFamilyMonthly.id,
    userId: user.id,
    amount: 50,
    status: PaymentStatus.APPROVED,
    note: 'Janvier',
    createdAt: new Date('2026-01-04T10:00:00.000Z'),
    validatedBy: admin.id,
    validatedAt: new Date('2026-01-04T11:00:00.000Z'),
  });

  await ensurePayment({
    contributionId: cFamilyMonthly.id,
    userId: user.id,
    amount: 50,
    status: PaymentStatus.APPROVED,
    note: 'Fevrier',
    createdAt: new Date('2026-02-04T10:00:00.000Z'),
    validatedBy: admin.id,
    validatedAt: new Date('2026-02-04T11:00:00.000Z'),
  });

  await ensurePayment({
    contributionId: cFamilyMonthly.id,
    userId: marie.id,
    amount: 50,
    status: PaymentStatus.DECLARED,
    note: 'Paiement mobile en attente',
    createdAt: new Date('2026-02-14T08:00:00.000Z'),
  });

  await ensurePayment({
    contributionId: cFamilyEmergency.id,
    userId: user.id,
    amount: 20,
    status: PaymentStatus.DIRECT,
    note: 'Urgence Janvier',
    createdAt: new Date('2026-01-15T08:00:00.000Z'),
    validatedBy: admin.id,
    validatedAt: new Date('2026-01-15T08:00:00.000Z'),
  });

  await ensurePayment({
    contributionId: cTravelMain.id,
    userId: admin.id,
    amount: 100,
    status: PaymentStatus.DECLARED,
    note: 'Participation admin en attente',
    createdAt: new Date('2026-02-09T10:00:00.000Z'),
  });

  await ensurePayment({
    contributionId: cOfficeFees.id,
    userId: user.id,
    amount: 35,
    status: PaymentStatus.APPROVED,
    note: 'Bureau - Fevrier',
    createdAt: new Date('2026-02-05T09:00:00.000Z'),
    validatedBy: admin.id,
    validatedAt: new Date('2026-02-05T09:30:00.000Z'),
  });

  await ensurePayment({
    contributionId: cOfficeFees.id,
    userId: marie.id,
    amount: 35,
    status: PaymentStatus.DECLARED,
    note: 'Bureau - en attente',
    createdAt: new Date('2026-02-06T11:00:00.000Z'),
  });

  await ensurePayment({
    contributionId: cDistrictPot.id,
    userId: admin.id,
    amount: 15000,
    status: PaymentStatus.DIRECT,
    note: 'Quartier - direct',
    createdAt: new Date('2026-02-10T15:00:00.000Z'),
    validatedBy: user.id,
    validatedAt: new Date('2026-02-10T15:00:00.000Z'),
  });

  await ensureInvitation({
    groupId: groupTravel.id,
    invitedById: user.id,
    email: samir.email,
    role: Role.MEMBER,
    startMode: MemberStartMode.NEXT_PERIOD,
  });

  await ensureInvitation({
    groupId: groupOffice.id,
    invitedById: admin.id,
    email: samir.email,
    role: Role.MEMBER,
    startMode: MemberStartMode.NEXT_PERIOD,
  });

  const [usersCount, groupsCount, membershipsCount, contributionsCount, periodsCount, paymentsCount, pendingInvites] = await Promise.all([
    prisma.user.count(),
    prisma.group.count(),
    prisma.groupMember.count(),
    prisma.contribution.count(),
    prisma.period.count(),
    prisma.payment.count(),
    prisma.groupInvitation.count({ where: { status: InvitationStatus.PENDING } }),
  ]);

  console.log('SEED_DONE');
  console.log('users:', usersCount);
  console.log('groups:', groupsCount);
  console.log('memberships:', membershipsCount);
  console.log('contributions:', contributionsCount);
  console.log('periods:', periodsCount);
  console.log('payments:', paymentsCount);
  console.log('pendingInvitations:', pendingInvites);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
