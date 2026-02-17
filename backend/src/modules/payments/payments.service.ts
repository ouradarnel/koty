import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { DeclarePaymentDto, DirectPaymentDto, ValidatePaymentDto } from './dto/payment.dto';
import { PaymentStatus, Role } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
  ) {}

  // Member declares a payment
  async declarePayment(contributionId: string, userId: string, declarePaymentDto: DeclarePaymentDto) {
    // Check if contribution exists
    const contribution = await this.prisma.contribution.findUnique({
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

    if (!contribution) {
      throw new NotFoundException('Contribution not found');
    }

    // Check if user is a member
    const isMember = contribution.group.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group');
    }

    const isContributionMember = await this.prisma.contributionMember.findFirst({
      where: {
        contributionId,
        endDate: null,
        member: {
          userId,
          endDate: null,
        },
      },
    });

    if (!isContributionMember) {
      throw new ForbiddenException('You are not a member of this contribution');
    }

    return this.prisma.payment.create({
      data: {
        userId,
        contributionId,
        amount: declarePaymentDto.amount,
        proofUrl: declarePaymentDto.proofUrl,
        note: declarePaymentDto.note,
        status: PaymentStatus.DECLARED,
      },
    });
  }

  // Manager records a direct payment
  async directPayment(contributionId: string, managerId: string, directPaymentDto: DirectPaymentDto) {
    // Check if contribution exists
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      include: {
        group: true,
      },
    });

    if (!contribution) {
      throw new NotFoundException('Contribution not found');
    }

    // Check if user is a manager
    await this.groupsService.checkManagerPermission(contribution.groupId, managerId);

    // Target user must be a member of the group
    const targetGroupMember = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: directPaymentDto.userId,
          groupId: contribution.groupId,
        },
      },
    });

    if (!targetGroupMember || targetGroupMember.endDate) {
      throw new ForbiddenException('Target user is not a member of this group');
    }

    // Target user must be part of the contribution
    const targetContributionMember = await this.prisma.contributionMember.findUnique({
      where: {
        contributionId_memberId: {
          contributionId,
          memberId: targetGroupMember.id,
        },
      },
    });

    if (!targetContributionMember || targetContributionMember.endDate) {
      throw new ForbiddenException('Target user is not a member of this contribution');
    }

    return this.prisma.payment.create({
      data: {
        userId: directPaymentDto.userId,
        contributionId,
        amount: directPaymentDto.amount,
        note: directPaymentDto.note,
        status: PaymentStatus.DIRECT,
        validatedAt: new Date(),
        validatedBy: managerId,
      },
    });
  }

  // Manager validates or rejects a declared payment
  async validatePayment(paymentId: string, managerId: string, validatePaymentDto: ValidatePaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        contribution: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.DECLARED) {
      throw new ForbiddenException('Only declared payments can be validated');
    }

    // Check if user is a manager
    await this.groupsService.checkManagerPermission(payment.contribution.groupId, managerId);

    const newStatus = validatePaymentDto.approve ? PaymentStatus.APPROVED : PaymentStatus.REJECTED;

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: newStatus,
        validatedAt: new Date(),
        validatedBy: managerId,
      },
    });
  }

  // Get pending payments for a contribution (manager only)
  async getPendingPayments(contributionId: string, managerId: string) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      include: {
        group: true,
      },
    });

    if (!contribution) {
      throw new NotFoundException('Contribution not found');
    }

    // Check if user is a manager
    await this.groupsService.checkManagerPermission(contribution.groupId, managerId);

    return this.prisma.payment.findMany({
      where: {
        contributionId,
        status: PaymentStatus.DECLARED,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Get payment history for a user in a contribution
  async getUserPayments(contributionId: string, targetUserId: string, requesterUserId: string) {
    const contribution = await this.prisma.contribution.findUnique({
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

    if (!contribution) {
      throw new NotFoundException('Contribution not found');
    }

    const requesterMembership = contribution.group.members.find((m) => m.userId === requesterUserId);
    if (!requesterMembership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    if (requesterUserId !== targetUserId && requesterMembership.role !== Role.MANAGER) {
      throw new ForbiddenException('Only managers can access other users payments');
    }

    const targetMembership = contribution.group.members.find((m) => m.userId === targetUserId);
    if (!targetMembership) {
      throw new NotFoundException('User not found in this group');
    }

    return this.prisma.payment.findMany({
      where: {
        contributionId,
        userId: targetUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async listManagerPendingNotifications(userId: string) {
    return this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.DECLARED,
        contribution: {
          group: {
            members: {
              some: {
                userId,
                role: Role.MANAGER,
                endDate: null,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 25,
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        note: true,
        userId: true,
        contributionId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contribution: {
          select: {
            id: true,
            name: true,
            currency: true,
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

  async listMyPaymentUpdates(userId: string, since?: string) {
    let sinceDate: Date | undefined;
    if (since) {
      sinceDate = new Date(since);
      if (Number.isNaN(sinceDate.getTime())) {
        throw new BadRequestException('Le paramètre "since" est invalide');
      }
    }

    return this.prisma.payment.findMany({
      where: {
        userId,
        status: {
          in: [PaymentStatus.APPROVED, PaymentStatus.REJECTED],
        },
        validatedAt: {
          ...(sinceDate ? { gt: sinceDate } : {}),
          not: null,
        },
      },
      orderBy: {
        validatedAt: 'desc',
      },
      take: 25,
      select: {
        id: true,
        amount: true,
        status: true,
        note: true,
        createdAt: true,
        validatedAt: true,
        contributionId: true,
        contribution: {
          select: {
            id: true,
            name: true,
            currency: true,
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
}
