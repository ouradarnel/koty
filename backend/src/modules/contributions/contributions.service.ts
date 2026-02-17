import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import {
  AcceptContributionInvitationDto,
  AddContributionMemberDto,
  ContributionInviteScope,
  CreateContributionDto,
  CreateContributionInvitationDto,
  UpdateContributionDto,
} from './dto/contribution.dto';
import { Contribution, Frequency, InvitationStatus, MemberStartMode, PaymentStatus, Role } from '@prisma/client';

@Injectable()
export class ContributionsService {
  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
  ) {}

  async create(groupId: string, userId: string, createContributionDto: CreateContributionDto) {
    // Check if user is a manager
    await this.groupsService.checkManagerPermission(groupId, userId);

    const frequency = createContributionDto.frequency;
    const deadlineDate =
      frequency === Frequency.DELAY
        ? createContributionDto.deadlineDate
          ? new Date(createContributionDto.deadlineDate)
          : null
        : null;

    if (frequency === Frequency.DELAY && !deadlineDate) {
      throw new BadRequestException('La date limite est obligatoire avec la fréquence délai');
    }

    const dueDay = frequency === Frequency.DELAY ? deadlineDate!.getDate() : createContributionDto.dueDay;
    if (!dueDay || dueDay < 1 || dueDay > 31) {
      throw new BadRequestException("Le jour d'échéance doit être entre 1 et 31");
    }

    const durationPeriods =
      frequency === Frequency.DELAY
        ? null
        : createContributionDto.durationPeriods
          ? Math.floor(createContributionDto.durationPeriods)
          : null;

    const firstPeriodDate =
      frequency !== Frequency.DELAY && createContributionDto.firstPeriodDate
        ? new Date(createContributionDto.firstPeriodDate)
        : null;

    if (firstPeriodDate && Number.isNaN(firstPeriodDate.getTime())) {
      throw new BadRequestException('La date de début de la première période est invalide');
    }

    if (durationPeriods !== null && durationPeriods <= 0) {
      throw new BadRequestException('La durée doit être supérieure à 0');
    }

    const inviteScope = createContributionDto.inviteScope ?? ContributionInviteScope.ALL;
    const invitationStartMode = createContributionDto.invitationStartMode ?? MemberStartMode.NEXT_PERIOD;
    const selectedInvitees =
      inviteScope === ContributionInviteScope.SELECTED ? new Set(createContributionDto.invitedUserIds ?? []) : null;

    if (inviteScope === ContributionInviteScope.SELECTED && (!selectedInvitees || selectedInvitees.size === 0)) {
      throw new BadRequestException('Sélectionne au moins un membre à inviter');
    }

    return this.prisma.$transaction(async (tx) => {
      const contribution = await tx.contribution.create({
        data: {
          name: createContributionDto.name,
          description: createContributionDto.description,
          amount: createContributionDto.amount,
          currency: createContributionDto.currency,
          frequency,
          dueDay,
          durationPeriods,
          deadlineDate,
          groupId,
        },
      });

      const initialPeriods = this.buildInitialPeriods(
        contribution.id,
        Number(createContributionDto.amount),
        frequency,
        dueDay,
        durationPeriods,
        deadlineDate,
        firstPeriodDate,
      );

      await tx.period.createMany({
        data: initialPeriods,
      });

      const activeMembers = await tx.groupMember.findMany({
        where: {
          groupId,
          endDate: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      const invitedMembers =
        inviteScope === ContributionInviteScope.ALL
          ? activeMembers
          : activeMembers.filter((member) => selectedInvitees?.has(member.userId));

      if (
        inviteScope === ContributionInviteScope.SELECTED &&
        selectedInvitees &&
        invitedMembers.length !== selectedInvitees.size
      ) {
        throw new BadRequestException('Certains utilisateurs sélectionnés ne sont pas des membres actifs du groupe');
      }

      if (invitedMembers.length > 0) {
        await tx.contributionInvitation.createMany({
          data: invitedMembers.map((member) => ({
            contributionId: contribution.id,
            invitedById: userId,
            inviteeUserId: member.user.id,
            email: member.user.email.toLowerCase(),
            startMode: invitationStartMode,
            status: InvitationStatus.PENDING,
            token: randomUUID(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          })),
        });
      }

      return contribution;
    });
  }

  async findAll(groupId: string, userId: string) {
    const membership = await this.groupsService.checkMembershipAndGetRole(groupId, userId);

    return this.prisma.contribution.findMany({
      where: {
        groupId,
        ...(membership.role === Role.MANAGER
          ? {}
          : {
              members: {
                some: {
                  endDate: null,
                  member: {
                    userId,
                    endDate: null,
                  },
                },
              },
            }),
      },
      include: {
        members: {
          include: {
            member: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        periods: {
          orderBy: {
            dueDate: 'desc',
          },
          take: 3,
        },
      },
    });
  }

  async findOne(contributionId: string, userId: string) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      include: {
        group: {
          include: {
            members: {
              where: {
                userId,
                endDate: null,
              },
            },
          },
        },
        members: {
          include: {
            member: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        periods: {
          orderBy: {
            dueDate: 'desc',
          },
        },
      },
    });

    if (!contribution) {
      throw new NotFoundException('Cotisation introuvable');
    }

    const membership = contribution.group.members[0];
    if (!membership) {
      throw new NotFoundException('Cotisation introuvable');
    }

    if (membership.role !== Role.MANAGER) {
      const isContributionMember = contribution.members.some(
        (member) => !member.endDate && !member.member.endDate && member.member.userId === userId,
      );
      if (!isContributionMember) {
        throw new NotFoundException('Cotisation introuvable');
      }
    }

    return contribution;
  }

  async update(contributionId: string, userId: string, updateContributionDto: UpdateContributionDto) {
    const contribution = await this.findOne(contributionId, userId);

    // Check if user is a manager
    await this.groupsService.checkManagerPermission(contribution.groupId, userId);

    // Update contribution
    const updated = await this.prisma.contribution.update({
      where: { id: contributionId },
      data: updateContributionDto,
    });

    // Si le montant change, la nouvelle valeur s'applique uniquement aux périodes futures
    if (updateContributionDto.amount !== undefined) {
      await this.generateNextPeriod(contributionId);
    }

    return updated;
  }

  async addMember(contributionId: string, userId: string, addMemberDto: AddContributionMemberDto) {
    return this.createInvitations(contributionId, userId, {
      userIds: [addMemberDto.userId],
      startMode: addMemberDto.startMode,
    });
  }

  async createInvitations(contributionId: string, userId: string, dto: CreateContributionInvitationDto) {
    const contribution = await this.findOne(contributionId, userId);
    await this.groupsService.checkManagerPermission(contribution.groupId, userId);

    const targetUserIds = Array.from(new Set(dto.userIds));
    const startMode = dto.startMode ?? MemberStartMode.NEXT_PERIOD;

    const activeGroupMembers = await this.prisma.groupMember.findMany({
      where: {
        groupId: contribution.groupId,
        endDate: null,
        userId: {
          in: targetUserIds,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (activeGroupMembers.length !== targetUserIds.length) {
      throw new BadRequestException('Certains utilisateurs sélectionnés ne sont pas des membres actifs du groupe');
    }

    const memberIds = activeGroupMembers.map((member) => member.id);
    const emails = activeGroupMembers.map((member) => member.user.email.toLowerCase());

    const [existingMembers, pendingInvitations] = await Promise.all([
      this.prisma.contributionMember.findMany({
        where: {
          contributionId,
          memberId: {
            in: memberIds,
          },
          endDate: null,
        },
        select: {
          memberId: true,
        },
      }),
      this.prisma.contributionInvitation.findMany({
        where: {
          contributionId,
          email: {
            in: emails,
          },
          status: InvitationStatus.PENDING,
        },
        select: {
          email: true,
        },
      }),
    ]);

    const existingMemberIds = new Set(existingMembers.map((member) => member.memberId));
    const pendingEmails = new Set(pendingInvitations.map((invitation) => invitation.email.toLowerCase()));

    const invitationsToCreate = activeGroupMembers.filter(
      (member) => !existingMemberIds.has(member.id) && !pendingEmails.has(member.user.email.toLowerCase()),
    );

    if (invitationsToCreate.length === 0) {
      return {
        created: 0,
        skippedAlreadyMembers: existingMemberIds.size,
        skippedPending: pendingEmails.size,
      };
    }

    await this.prisma.contributionInvitation.createMany({
      data: invitationsToCreate.map((member) => ({
        contributionId,
        invitedById: userId,
        inviteeUserId: member.user.id,
        email: member.user.email.toLowerCase(),
        startMode,
        status: InvitationStatus.PENDING,
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })),
    });

    return {
      created: invitationsToCreate.length,
      skippedAlreadyMembers: existingMemberIds.size,
      skippedPending: pendingEmails.size,
    };
  }

  async listPendingInvitations(contributionId: string, userId: string) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      select: { groupId: true },
    });

    if (!contribution) {
      throw new NotFoundException('Cotisation introuvable');
    }

    await this.groupsService.checkManagerPermission(contribution.groupId, userId);

    return this.prisma.contributionInvitation.findMany({
      where: {
        contributionId,
        status: InvitationStatus.PENDING,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        contributionId: true,
        email: true,
        startMode: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async listMyPendingInvitations(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return this.prisma.contributionInvitation.findMany({
      where: {
        email: user.email.toLowerCase(),
        status: InvitationStatus.PENDING,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        contributionId: true,
        email: true,
        startMode: true,
        status: true,
        token: true,
        createdAt: true,
        contribution: {
          select: {
            name: true,
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async acceptInvitation(userId: string, dto: AcceptContributionInvitationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const invitation = await this.prisma.contributionInvitation.findUnique({
      where: {
        token: dto.token,
      },
      include: {
        contribution: {
          include: {
            group: {
              select: {
                id: true,
              },
            },
            periods: {
              orderBy: {
                dueDate: 'asc',
              },
              select: {
                dueDate: true,
              },
            },
          },
        },
      },
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new NotFoundException('Invitation introuvable ou déjà traitée');
    }

    if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
      await this.prisma.contributionInvitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          status: InvitationStatus.EXPIRED,
          respondedAt: new Date(),
        },
      });
      throw new BadRequestException("L'invitation a expiré");
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException("Cette invitation n'appartient pas à l'utilisateur connecté");
    }

    const groupMember = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: invitation.contribution.group.id,
        },
      },
    });

    if (!groupMember || groupMember.endDate) {
      throw new ForbiddenException("Tu n'es plus membre actif de ce groupe");
    }

    const existingContributionMember = await this.prisma.contributionMember.findUnique({
      where: {
        contributionId_memberId: {
          contributionId: invitation.contributionId,
          memberId: groupMember.id,
        },
      },
    });

    if (existingContributionMember) {
      throw new BadRequestException('Tu participes déjà à cette cotisation');
    }

    const startDate = this.getStartDateForInvitationMode(invitation.contribution, invitation.startMode);

    return this.prisma.$transaction(async (tx) => {
      await tx.contributionInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          inviteeUserId: userId,
          respondedAt: new Date(),
        },
      });

      return tx.contributionMember.create({
        data: {
          contributionId: invitation.contributionId,
          memberId: groupMember.id,
          startDate,
        },
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async declineInvitation(invitationId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const invitation = await this.prisma.contributionInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new NotFoundException('Invitation introuvable ou déjà traitée');
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException("Cette invitation n'appartient pas à l'utilisateur connecté");
    }

    return this.prisma.contributionInvitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.DECLINED,
        respondedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
      },
    });
  }

  // Generate next period for a contribution
  private async generateNextPeriod(contributionId: string) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      include: {
        periods: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!contribution) return;
    if (contribution.frequency === Frequency.DELAY) return;
    if (
      contribution.durationPeriods !== null &&
      contribution.durationPeriods !== undefined &&
      contribution.periods.length >= contribution.durationPeriods
    ) {
      return;
    }

    const now = new Date();
    const { year: currentYear, month: currentMonth } = this.getCurrentCycleStart(now, contribution.frequency);

    // Check if current period already exists
    const existingPeriod = await this.prisma.period.findUnique({
      where: {
        contributionId_month_year: {
          contributionId,
          month: currentMonth,
          year: currentYear,
        },
      },
    });

    if (existingPeriod) return;

    // Create due date for this period
    const dueDate = this.buildDueDate(currentYear, currentMonth, contribution.dueDay);

    // Create period
    await this.prisma.period.create({
      data: {
        contributionId,
        month: currentMonth,
        year: currentYear,
        amount: contribution.amount,
        dueDate,
      },
    });
  }

  private async getNextPeriodDate(contributionId: string): Promise<Date> {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
    });

    if (!contribution) throw new NotFoundException('Cotisation introuvable');
    if (contribution.frequency === Frequency.DELAY) {
      return contribution.deadlineDate ?? new Date();
    }

    const now = new Date();
    const currentCycle = this.getCurrentCycleStart(now, contribution.frequency);
    const intervalMonths = this.getFrequencyIntervalMonths(contribution.frequency);
    const { year: nextYear, month: nextMonth } = this.addMonths(currentCycle.year, currentCycle.month, intervalMonths);

    return this.buildDueDate(nextYear, nextMonth, contribution.dueDay);
  }

  private getStartDateForInvitationMode(
    contribution: Pick<Contribution, 'frequency' | 'dueDay' | 'deadlineDate'> & { periods?: Array<{ dueDate: Date }> },
    startMode: MemberStartMode,
  ): Date {
    if (contribution.frequency === Frequency.DELAY) {
      return contribution.deadlineDate ?? new Date();
    }

    const now = new Date();
    const currentCycle = this.getCurrentCycleStart(now, contribution.frequency);

    if (startMode === MemberStartMode.CATCH_UP) {
      const earliestDueDate = contribution.periods
        ?.map((period) => period.dueDate)
        .sort((a, b) => a.getTime() - b.getTime())[0];

      if (earliestDueDate) {
        return earliestDueDate;
      }

      return this.buildDueDate(currentCycle.year, currentCycle.month, contribution.dueDay);
    }

    if (startMode === MemberStartMode.CURRENT_PERIOD) {
      return this.buildDueDate(currentCycle.year, currentCycle.month, contribution.dueDay);
    }

    const intervalMonths = this.getFrequencyIntervalMonths(contribution.frequency);
    const nextCycle = this.addMonths(currentCycle.year, currentCycle.month, intervalMonths);
    return this.buildDueDate(nextCycle.year, nextCycle.month, contribution.dueDay);
  }

  private buildInitialPeriods(
    contributionId: string,
    amount: number,
    frequency: Frequency,
    dueDay: number,
    durationPeriods: number | null,
    deadlineDate: Date | null,
    firstPeriodDate: Date | null,
  ) {
    if (frequency === Frequency.DELAY) {
      const dueDate = deadlineDate ?? new Date();
      return [
        {
          contributionId,
          month: dueDate.getMonth() + 1,
          year: dueDate.getFullYear(),
          amount,
          dueDate,
        },
      ];
    }

    const startReferenceDate = firstPeriodDate ?? new Date();
    const intervalMonths = this.getFrequencyIntervalMonths(frequency);
    const startCycle = this.getCurrentCycleStart(startReferenceDate, frequency);
    const count = durationPeriods ?? (frequency === Frequency.QUARTERLY ? 8 : 12);
    const periods: Array<{
      contributionId: string;
      month: number;
      year: number;
      amount: number;
      dueDate: Date;
    }> = [];

    for (let index = 0; index < count; index += 1) {
      const shifted = this.addMonths(startCycle.year, startCycle.month, intervalMonths * index);
      periods.push({
        contributionId,
        month: shifted.month,
        year: shifted.year,
        amount,
        dueDate: this.buildDueDate(shifted.year, shifted.month, dueDay),
      });
    }

    return periods;
  }

  private getFrequencyIntervalMonths(frequency: Frequency): number {
    return frequency === Frequency.QUARTERLY ? 3 : 1;
  }

  private getCurrentCycleStart(date: Date, frequency: Frequency): { year: number; month: number } {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    if (frequency !== Frequency.QUARTERLY) {
      return { year, month };
    }

    const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
    return { year, month: quarterStartMonth };
  }

  private addMonths(year: number, month: number, delta: number): { year: number; month: number } {
    let targetYear = year;
    let targetMonth = month + delta;
    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }
    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }
    return { year: targetYear, month: targetMonth };
  }

  private buildDueDate(year: number, month: number, dueDay: number): Date {
    const maxDay = new Date(year, month, 0).getDate();
    const safeDay = Math.min(dueDay, maxDay);
    return new Date(year, month - 1, safeDay);
  }

  // Calculate balance for a target user in a contribution.
  // The requester can view their own balance, or a manager can view any member balance.
  async calculateBalance(contributionId: string, targetUserId: string, requesterUserId: string = targetUserId) {
    const contributionWithGroup = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      include: {
        group: {
          include: {
            members: {
              where: {
                endDate: null,
              },
            },
          },
        },
      },
    });

    if (!contributionWithGroup) {
      throw new NotFoundException('Cotisation introuvable');
    }

    const requesterMembership = contributionWithGroup.group.members.find((m) => m.userId === requesterUserId);
    if (!requesterMembership) {
      throw new NotFoundException('Cotisation introuvable');
    }

    if (requesterUserId !== targetUserId && requesterMembership.role !== Role.MANAGER) {
      throw new ForbiddenException('Seuls les gestionnaires peuvent consulter le solde des autres membres');
    }

    // Get all periods up to now
    const now = new Date();
    const periods = await this.prisma.period.findMany({
      where: {
        contributionId,
        dueDate: {
          lte: now,
        },
      },
    });

    // Get contribution member info
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      include: {
        members: {
          where: {
            endDate: null,
            member: {
              userId: targetUserId,
              endDate: null,
            },
          },
        },
      },
    });

    if (!contribution || contribution.members.length === 0) {
      return {
        expected: 0,
        paid: 0,
        balance: 0,
      };
    }

    const memberStartDate = contribution.members[0].startDate;
    const memberEndDate = contribution.members[0].endDate;

    // Calculate expected amount (only periods after member joined)
    const expectedAmount = periods
      .filter((p) => p.dueDate >= memberStartDate && (!memberEndDate || p.dueDate <= memberEndDate))
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Get all approved/direct payments
    const payments = await this.prisma.payment.findMany({
      where: {
        contributionId,
        userId: targetUserId,
        status: {
          in: [PaymentStatus.APPROVED, PaymentStatus.DIRECT],
        },
      },
    });

    const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      expected: expectedAmount,
      paid: paidAmount,
      balance: paidAmount - expectedAmount,
    };
  }
}
