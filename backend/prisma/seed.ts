import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  Contribution,
  ContributionInvitation,
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
  forcePasswordUpdate?: boolean;
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

type EnsureContributionInvitationInput = {
  contributionId: string;
  invitedById: string;
  email: string;
  startMode: MemberStartMode;
};

type StressSeedConfig = {
  managersCount: number;
  membersCount: number;
  groupsPerManager: number;
  membersPerGroup: number;
  contributionsPerGroup: number;
  periodsPerContribution: number;
  pendingGroupInvitesPerGroup: number;
  pendingContributionInvitesPerContribution: number;
};

async function ensureUser(input: EnsureUserInput): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  const normalizedName = `${input.firstName} ${input.lastName}`.trim();
  if (existing) {
    const shouldUpdatePassword = input.forcePasswordUpdate === true;
    let hashedPasswordToPersist: string | null = null;
    if (shouldUpdatePassword) {
      const samePassword = await bcrypt.compare(input.password, existing.password);
      if (!samePassword) {
        hashedPasswordToPersist = await bcrypt.hash(input.password, 10);
      }
    }

    if (
      existing.firstName !== input.firstName ||
      existing.lastName !== input.lastName ||
      existing.name !== normalizedName ||
      existing.isAdmin !== (input.isAdmin ?? false) ||
      hashedPasswordToPersist !== null
    ) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          name: normalizedName,
          isAdmin: input.isAdmin ?? false,
          ...(hashedPasswordToPersist ? { password: hashedPasswordToPersist } : {}),
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

async function ensureContributionWithConfig(input: {
  groupId: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  frequency: Frequency;
  dueDay: number;
  durationPeriods?: number | null;
  deadlineDate?: Date | null;
}): Promise<Contribution> {
  const existing = await prisma.contribution.findFirst({
    where: {
      groupId: input.groupId,
      name: input.name,
    },
  });

  if (existing) {
    return prisma.contribution.update({
      where: { id: existing.id },
      data: {
        description: input.description,
        amount: input.amount,
        currency: input.currency,
        frequency: input.frequency,
        dueDay: input.dueDay,
        durationPeriods: input.durationPeriods ?? null,
        deadlineDate: input.deadlineDate ?? null,
        isActive: true,
      },
    });
  }

  return prisma.contribution.create({
    data: {
      groupId: input.groupId,
      name: input.name,
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      frequency: input.frequency,
      dueDay: input.dueDay,
      durationPeriods: input.durationPeriods ?? null,
      deadlineDate: input.deadlineDate ?? null,
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

async function ensureContributionInvitation(input: EnsureContributionInvitationInput): Promise<ContributionInvitation> {
  const existing = await prisma.contributionInvitation.findFirst({
    where: {
      contributionId: input.contributionId,
      email: input.email,
      status: InvitationStatus.PENDING,
    },
  });

  if (existing) return existing;

  return prisma.contributionInvitation.create({
    data: {
      contributionId: input.contributionId,
      invitedById: input.invitedById,
      email: input.email,
      startMode: input.startMode,
      status: InvitationStatus.PENDING,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

function toIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getStressConfig(): StressSeedConfig {
  return {
    managersCount: toIntEnv('KOTY_SEED_MANAGERS', 12),
    membersCount: toIntEnv('KOTY_SEED_MEMBERS', 120),
    groupsPerManager: toIntEnv('KOTY_SEED_GROUPS_PER_MANAGER', 3),
    membersPerGroup: toIntEnv('KOTY_SEED_MEMBERS_PER_GROUP', 18),
    contributionsPerGroup: toIntEnv('KOTY_SEED_CONTRIBUTIONS_PER_GROUP', 4),
    periodsPerContribution: toIntEnv('KOTY_SEED_PERIODS_PER_CONTRIBUTION', 4),
    pendingGroupInvitesPerGroup: toIntEnv('KOTY_SEED_GROUP_INVITES_PER_GROUP', 2),
    pendingContributionInvitesPerContribution: toIntEnv('KOTY_SEED_CONTRIBUTION_INVITES_PER_CONTRIBUTION', 1),
  };
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickCurrency(index: number): string {
  if (index % 3 === 0) return 'EUR';
  if (index % 3 === 1) return 'USD';
  return 'XOF';
}

function pickFrequency(index: number): Frequency {
  if (index % 3 === 0) return Frequency.MONTHLY;
  if (index % 3 === 1) return Frequency.QUARTERLY;
  return Frequency.DELAY;
}

function plusMonths(baseDate: Date, monthsToAdd: number): Date {
  return new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + monthsToAdd, baseDate.getUTCDate(), 0, 0, 0, 0));
}

async function seedStressData(admin: User, managersSeed: User[], membersSeed: User[], cfg: StressSeedConfig) {
  const createdGroups: Group[] = [];
  const allMembersForInvites = [...managersSeed, ...membersSeed];
  const baseMonthStart = new Date('2026-01-01T00:00:00.000Z');

  for (let managerIndex = 0; managerIndex < managersSeed.length; managerIndex += 1) {
    const manager = managersSeed[managerIndex];

    for (let groupOffset = 0; groupOffset < cfg.groupsPerManager; groupOffset += 1) {
      const groupOrdinal = managerIndex * cfg.groupsPerManager + groupOffset + 1;
      const group = await ensureGroup({
        name: `Groupe Test ${String(groupOrdinal).padStart(3, '0')}`,
        description: `Groupe de test volumique ${groupOrdinal} (phase 3).`,
        createdById: manager.id,
      });
      createdGroups.push(group);

      const managerMembership = await ensureMembership({
        groupId: group.id,
        userId: manager.id,
        role: Role.MANAGER,
        startDate: baseMonthStart,
      });

      const groupMembers: GroupMember[] = [managerMembership];

      for (let memberOffset = 0; memberOffset < cfg.membersPerGroup; memberOffset += 1) {
        const picked = membersSeed[(groupOrdinal * 17 + memberOffset) % membersSeed.length];
        const role = memberOffset === 0 && groupOrdinal % 6 === 0 ? Role.MANAGER : Role.MEMBER;
        const membership = await ensureMembership({
          groupId: group.id,
          userId: picked.id,
          role,
          startDate: baseMonthStart,
        });
        groupMembers.push(membership);
      }

      for (let inviteOffset = 0; inviteOffset < cfg.pendingGroupInvitesPerGroup; inviteOffset += 1) {
        const invitee = allMembersForInvites[(groupOrdinal * 11 + inviteOffset) % allMembersForInvites.length];
        await ensureInvitation({
          groupId: group.id,
          invitedById: manager.id,
          email: invitee.email,
          role: Role.MEMBER,
          startMode: inviteOffset % 2 === 0 ? MemberStartMode.NEXT_PERIOD : MemberStartMode.CATCH_UP,
        });
      }

      for (let contributionOffset = 0; contributionOffset < cfg.contributionsPerGroup; contributionOffset += 1) {
        const contributionOrdinal = groupOrdinal * 100 + contributionOffset + 1;
        const frequency = pickFrequency(contributionOrdinal);
        const dueDay = (contributionOrdinal % 25) + 1;
        const amountBase = (contributionOrdinal % 9) + 1;

        const contribution = await ensureContributionWithConfig({
          groupId: group.id,
          name: `Caisse ${String(contributionOrdinal).padStart(4, '0')}`,
          description: `Cotisation de test ${contributionOrdinal}`,
          amount: frequency === Frequency.DELAY ? amountBase * 75 : amountBase * 20,
          currency: pickCurrency(contributionOrdinal),
          frequency,
          dueDay,
          durationPeriods: frequency === Frequency.DELAY ? null : 12,
          deadlineDate: frequency === Frequency.DELAY ? plusMonths(baseMonthStart, 6) : null,
        });

        const participantCount = Math.min(groupMembers.length, 6 + (contributionOrdinal % 4));
        const participantMembers = groupMembers.slice(0, participantCount);

        for (const participant of participantMembers) {
          await ensureContributionMember({
            contributionId: contribution.id,
            memberId: participant.id,
            startDate: baseMonthStart,
          });
        }

        for (let periodOffset = 0; periodOffset < cfg.periodsPerContribution; periodOffset += 1) {
          const dueDate = new Date(Date.UTC(2026, periodOffset, dueDay, 0, 0, 0, 0));
          await ensurePeriod({
            contributionId: contribution.id,
            month: dueDate.getUTCMonth() + 1,
            year: dueDate.getUTCFullYear(),
            amount: Number(contribution.amount),
            dueDate,
          });
        }

        for (const participant of participantMembers) {
          const statusIndex = hashString(`${contribution.id}:${participant.userId}`) % 5;
          const status =
            statusIndex === 0
              ? PaymentStatus.DECLARED
              : statusIndex === 1
                ? PaymentStatus.DIRECT
                : statusIndex === 2
                  ? PaymentStatus.REJECTED
                  : PaymentStatus.APPROVED;

          const managerForValidation = participant.userId === manager.id ? admin.id : manager.id;
          const validatedAt =
            status === PaymentStatus.APPROVED || status === PaymentStatus.DIRECT || status === PaymentStatus.REJECTED
              ? new Date('2026-02-10T10:00:00.000Z')
              : undefined;

          await ensurePayment({
            contributionId: contribution.id,
            userId: participant.userId,
            amount: Number(contribution.amount),
            status,
            note: `seed-stress-${contributionOrdinal}-${participant.userId.slice(0, 8)}`,
            createdAt: new Date('2026-02-08T09:00:00.000Z'),
            validatedBy: validatedAt ? managerForValidation : undefined,
            validatedAt,
          });
        }

        for (let inviteOffset = 0; inviteOffset < cfg.pendingContributionInvitesPerContribution; inviteOffset += 1) {
          const invitee = membersSeed[(contributionOrdinal * 13 + inviteOffset) % membersSeed.length];
          await ensureContributionInvitation({
            contributionId: contribution.id,
            invitedById: manager.id,
            email: invitee.email,
            startMode: inviteOffset % 2 === 0 ? MemberStartMode.NEXT_PERIOD : MemberStartMode.CATCH_UP,
          });
        }
      }
    }
  }
}

async function seed() {
  const mode = process.env.KOTY_SEED_MODE ?? 'standard';
  const demoPassword = process.env.KOTY_PUBLIC_DEMO_PASSWORD ?? 'KotyDemo123!';
  const admin = await ensureUser({ email: 'admin@local.dev', firstName: 'Admin', lastName: 'Local', password: 'admin123', isAdmin: true });
  const user = await ensureUser({ email: 'user@local.dev', firstName: 'User', lastName: 'Local', password: 'user123' });
  const marie = await ensureUser({ email: 'marie@local.dev', firstName: 'Marie', lastName: 'Diallo', password: 'user123' });
  const samir = await ensureUser({ email: 'samir@local.dev', firstName: 'Samir', lastName: 'Traore', password: 'user123' });
  const demo = await ensureUser({
    email: 'demo@koty.local',
    firstName: 'Compte',
    lastName: 'Démo',
    password: demoPassword,
    forcePasswordUpdate: true,
  });

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

  const groupDemo = await ensureGroup({
    name: 'Koty - Groupe Démo',
    description: 'Groupe public de démonstration pour tester l’application',
    createdById: demo.id,
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

  const gmDemoDemo = await ensureMembership({ groupId: groupDemo.id, userId: demo.id, role: Role.MANAGER, startDate: startCurrent });
  const gmUserDemo = await ensureMembership({ groupId: groupDemo.id, userId: user.id, role: Role.MEMBER, startDate: startCurrent });
  const gmMarieDemo = await ensureMembership({ groupId: groupDemo.id, userId: marie.id, role: Role.MEMBER, startDate: startCurrent });

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

  const cDemoMonthly = await ensureContribution({
    groupId: groupDemo.id,
    name: 'Caisse Démo Mensuelle',
    description: 'Caisse de test ouverte aux démonstrations',
    amount: 40,
    currency: 'EUR',
    dueDay: 8,
  });

  const cDemoUrgency = await ensureContributionWithConfig({
    groupId: groupDemo.id,
    name: 'Caisse Démo Urgence',
    description: 'Démonstration des contributions ponctuelles',
    amount: 120,
    currency: 'EUR',
    frequency: Frequency.DELAY,
    dueDay: 1,
    deadlineDate: new Date('2026-04-20T00:00:00.000Z'),
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

  await ensureContributionMember({ contributionId: cDemoMonthly.id, memberId: gmDemoDemo.id, startDate: startCurrent });
  await ensureContributionMember({ contributionId: cDemoMonthly.id, memberId: gmUserDemo.id, startDate: startCurrent });
  await ensureContributionMember({ contributionId: cDemoMonthly.id, memberId: gmMarieDemo.id, startDate: startCurrent });
  await ensureContributionMember({ contributionId: cDemoUrgency.id, memberId: gmDemoDemo.id, startDate: startCurrent });
  await ensureContributionMember({ contributionId: cDemoUrgency.id, memberId: gmUserDemo.id, startDate: startCurrent });

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

  await ensurePeriod({ contributionId: cDemoMonthly.id, month: 1, year: 2026, amount: 40, dueDate: new Date('2026-01-08T00:00:00.000Z') });
  await ensurePeriod({ contributionId: cDemoMonthly.id, month: 2, year: 2026, amount: 40, dueDate: new Date('2026-02-08T00:00:00.000Z') });
  await ensurePeriod({ contributionId: cDemoMonthly.id, month: 3, year: 2026, amount: 40, dueDate: new Date('2026-03-08T00:00:00.000Z') });

  await ensurePeriod({ contributionId: cDemoUrgency.id, month: 4, year: 2026, amount: 120, dueDate: new Date('2026-04-20T00:00:00.000Z') });

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

  await ensurePayment({
    contributionId: cDemoMonthly.id,
    userId: demo.id,
    amount: 40,
    status: PaymentStatus.APPROVED,
    note: 'Démo janvier',
    createdAt: new Date('2026-01-07T09:00:00.000Z'),
    validatedBy: demo.id,
    validatedAt: new Date('2026-01-07T09:05:00.000Z'),
  });

  await ensurePayment({
    contributionId: cDemoMonthly.id,
    userId: user.id,
    amount: 40,
    status: PaymentStatus.APPROVED,
    note: 'Démo février',
    createdAt: new Date('2026-02-07T10:00:00.000Z'),
    validatedBy: demo.id,
    validatedAt: new Date('2026-02-07T10:05:00.000Z'),
  });

  await ensurePayment({
    contributionId: cDemoMonthly.id,
    userId: marie.id,
    amount: 40,
    status: PaymentStatus.DECLARED,
    note: 'Démo en attente',
    createdAt: new Date('2026-03-07T12:00:00.000Z'),
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

  if (mode === 'stress') {
    const cfg = getStressConfig();

    const managerUsers: User[] = [];
    const memberUsers: User[] = [];
    const stressPassword = process.env.KOTY_SEED_PASSWORD ?? 'Test1234!';

    for (let i = 1; i <= cfg.managersCount; i += 1) {
      const firstName = `Manager${String(i).padStart(2, '0')}`;
      const lastName = 'Test';
      managerUsers.push(
        await ensureUser({
          email: `manager.${String(i).padStart(2, '0')}@local.dev`,
          firstName,
          lastName,
          password: stressPassword,
        }),
      );
    }

    for (let i = 1; i <= cfg.membersCount; i += 1) {
      const firstName = `Membre${String(i).padStart(3, '0')}`;
      const lastName = 'Test';
      memberUsers.push(
        await ensureUser({
          email: `membre.${String(i).padStart(3, '0')}@local.dev`,
          firstName,
          lastName,
          password: stressPassword,
        }),
      );
    }

    await seedStressData(admin, managerUsers, memberUsers, cfg);
  }

  const [usersCount, groupsCount, membershipsCount, contributionsCount, periodsCount, paymentsCount, pendingGroupInvites, pendingContributionInvites] =
    await Promise.all([
    prisma.user.count(),
    prisma.group.count(),
    prisma.groupMember.count(),
    prisma.contribution.count(),
    prisma.period.count(),
    prisma.payment.count(),
    prisma.groupInvitation.count({ where: { status: InvitationStatus.PENDING } }),
    prisma.contributionInvitation.count({ where: { status: InvitationStatus.PENDING } }),
    ]);

  console.log('SEED_DONE');
  console.log('mode:', mode);
  console.log('users:', usersCount);
  console.log('groups:', groupsCount);
  console.log('memberships:', membershipsCount);
  console.log('contributions:', contributionsCount);
  console.log('periods:', periodsCount);
  console.log('payments:', paymentsCount);
  console.log('pendingGroupInvitations:', pendingGroupInvites);
  console.log('pendingContributionInvitations:', pendingContributionInvites);
  console.log('compteDemoEmail:', demo.email);
  console.log('compteDemoMotDePasse:', demoPassword);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
