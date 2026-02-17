import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { ContributionsService } from '../contributions/contributions.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
    private contributionsService: ContributionsService,
  ) {}

  // Dashboard for a member
  async getMemberDashboard(groupId: string, userId: string) {
    // Check membership
    await this.groupsService.checkMembershipAndGetRole(groupId, userId);

    // Get all contributions in this group
    const contributions = await this.prisma.contribution.findMany({
      where: {
        groupId,
        members: {
          some: {
            endDate: null,
            member: {
              userId,
              endDate: null,
            },
          },
        },
      },
      include: {
        members: {
          where: {
            endDate: null,
            member: {
              userId,
              endDate: null,
            },
          },
        },
      },
    });

    // Calculate balance for each contribution
    const contributionsWithBalance = await Promise.all(
      contributions.map(async (contribution) => {
        const balance = await this.contributionsService.calculateBalance(contribution.id, userId, userId);
        return {
          ...contribution,
          balance,
        };
      }),
    );

    // Get recent payments
    const recentPayments = await this.prisma.payment.findMany({
      where: {
        userId,
        contribution: {
          groupId,
        },
      },
      include: {
        contribution: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return {
      contributions: contributionsWithBalance,
      recentPayments,
    };
  }

  // Dashboard for a manager
  async getManagerDashboard(groupId: string, userId: string) {
    // Check if user is a manager
    await this.groupsService.checkManagerPermission(groupId, userId);

    // Get group details
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
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
        contributions: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // For each contribution, get stats
    const contributionsStats = await Promise.all(
      group.contributions.map(async (contribution) => {
        // Get all periods up to now
        const now = new Date();
        const periods = await this.prisma.period.findMany({
          where: {
            contributionId: contribution.id,
            dueDate: {
              lte: now,
            },
          },
        });

        // Get all contribution members
        const members = await this.prisma.contributionMember.findMany({
          where: {
            contributionId: contribution.id,
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

        // Calculate expected total
        let expectedTotal = 0;
        for (const period of periods) {
          const membersAtThatTime = members.filter((m) => m.startDate <= period.dueDate);
          expectedTotal += membersAtThatTime.length * Number(period.amount);
        }

        // Get collected total
        const payments = await this.prisma.payment.findMany({
          where: {
            contributionId: contribution.id,
            status: {
              in: [PaymentStatus.APPROVED, PaymentStatus.DIRECT],
            },
          },
        });

        const collectedTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0);

        // Get pending payments count
        const pendingPayments = await this.prisma.payment.count({
          where: {
            contributionId: contribution.id,
            status: PaymentStatus.DECLARED,
          },
        });

        // Get members with balances
        const membersWithBalances = await Promise.all(
          members.map(async (member) => {
            const balance = await this.contributionsService.calculateBalance(
              contribution.id,
              member.member.userId,
              userId,
            );
            return {
              user: member.member.user,
              balance,
            };
          }),
        );

        return {
          id: contribution.id,
          name: contribution.name,
          currency: contribution.currency,
          expectedTotal,
          collectedTotal,
          deficit: expectedTotal - collectedTotal,
          pendingPayments,
          members: membersWithBalances,
        };
      }),
    );

    return {
      group,
      contributionsStats,
    };
  }
}
