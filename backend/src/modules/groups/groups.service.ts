import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateGroupDto,
  AddMemberDto,
  UpdateMemberRoleDto,
  CreateGroupInvitationDto,
  AcceptGroupInvitationDto,
} from './dto/group.dto';
import { MemberStartMode, InvitationStatus, Role } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  private getContributionVisibilityWhere(userId: string) {
    return {
      OR: [
        {
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
        {
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
      ],
    };
  }

  async create(userId: string, createGroupDto: CreateGroupDto) {
    return this.prisma.group.create({
      data: {
        ...createGroupDto,
        createdById: userId,
        members: {
          create: {
            userId,
            role: Role.MANAGER,
            startDate: new Date(),
          },
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          where: {
            endDate: null,
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
        },
      },
    });
  }

  async findAll(userId: string, options?: { createdByMe?: boolean }) {
    const where = options?.createdByMe
      ? {
          createdById: userId,
        }
      : {
          members: {
            some: {
              userId,
              endDate: null,
            },
          },
        };

    return this.prisma.group.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          where: {
            endDate: null,
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
        },
        contributions: {
          where: this.getContributionVisibilityWhere(userId),
          select: {
            id: true,
            name: true,
            amount: true,
            currency: true,
            frequency: true,
            durationPeriods: true,
            deadlineDate: true,
            dueDay: true,
          },
        },
      },
    });
  }

  async findOne(groupId: string, userId: string) {
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        members: {
          some: {
            userId,
            endDate: null,
          },
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          where: {
            endDate: null,
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
        },
        contributions: {
          where: this.getContributionVisibilityWhere(userId),
          select: {
            id: true,
            name: true,
            description: true,
            amount: true,
            currency: true,
            frequency: true,
            durationPeriods: true,
            deadlineDate: true,
            dueDay: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            groupId: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found or access denied');
    }

    return group;
  }

  async addMember(groupId: string, userId: string, addMemberDto: AddMemberDto) {
    await this.checkManagerPermission(groupId, userId);

    const normalizedEmail = addMemberDto.email.trim().toLowerCase();
    const userToAdd = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!userToAdd) {
      throw new NotFoundException('User not found');
    }

    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: userToAdd.id,
          groupId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this group');
    }

    const targetGroup = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
      },
    });

    if (!targetGroup) {
      throw new NotFoundException('Group not found');
    }

    return this.prisma.$transaction(async (tx) => {
      return tx.groupMember.create({
        data: {
          userId: userToAdd.id,
          groupId,
          role: addMemberDto.role || Role.MEMBER,
          startDate: new Date(),
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
      });
    });
  }

  async createInvitation(groupId: string, userId: string, dto: CreateGroupInvitationDto) {
    await this.checkManagerPermission(groupId, userId);

    const email = dto.email.trim().toLowerCase();

    const existingActiveMember = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        endDate: null,
        user: {
          email,
        },
      },
    });

    if (existingActiveMember) {
      throw new BadRequestException('User is already an active member of this group');
    }

    const existingPendingInvitation = await this.prisma.groupInvitation.findFirst({
      where: {
        groupId,
        email,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingPendingInvitation) {
      throw new BadRequestException('A pending invitation already exists for this email');
    }

    return this.prisma.groupInvitation.create({
      data: {
        groupId,
        invitedById: userId,
        email,
        role: dto.role ?? Role.MEMBER,
        startMode: MemberStartMode.CURRENT_PERIOD,
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      select: {
        id: true,
        email: true,
        role: true,
        startMode: true,
        status: true,
        token: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async listPendingInvitations(groupId: string, userId: string) {
    await this.checkManagerPermission(groupId, userId);

    return this.prisma.groupInvitation.findMany({
      where: {
        groupId,
        status: InvitationStatus.PENDING,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        role: true,
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
      throw new NotFoundException('User not found');
    }

    return this.prisma.groupInvitation.findMany({
      where: {
        email: user.email.toLowerCase(),
        status: InvitationStatus.PENDING,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        groupId: true,
        email: true,
        role: true,
        startMode: true,
        status: true,
        token: true,
        createdAt: true,
        group: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async acceptInvitation(userId: string, dto: AcceptGroupInvitationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { token: dto.token },
      include: {
        group: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new NotFoundException('Invitation not found or already processed');
    }

    if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
      await this.prisma.groupInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.EXPIRED,
          respondedAt: new Date(),
        },
      });
      throw new BadRequestException('Invitation has expired');
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('This invitation does not belong to the current user');
    }

    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: invitation.groupId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this group');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.groupInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          inviteeUserId: userId,
          respondedAt: new Date(),
        },
      });

      return tx.groupMember.create({
        data: {
          groupId: invitation.groupId,
          userId,
          role: invitation.role,
          startDate: new Date(),
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
      });
    });
  }

  async declineInvitation(invitationId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new NotFoundException('Invitation not found or already processed');
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('This invitation does not belong to the current user');
    }

    return this.prisma.groupInvitation.update({
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

  async updateMemberRole(groupId: string, memberId: string, userId: string, updateMemberRoleDto: UpdateMemberRoleDto) {
    await this.checkManagerPermission(groupId, userId);

    const member = await this.prisma.groupMember.findFirst({
      where: {
        id: memberId,
        groupId,
        endDate: null,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === Role.MANAGER && updateMemberRoleDto.role !== Role.MANAGER) {
      const managersCount = await this.prisma.groupMember.count({
        where: {
          groupId,
          endDate: null,
          role: Role.MANAGER,
        },
      });

      if (managersCount <= 1) {
        throw new BadRequestException('A group must always have at least one manager');
      }
    }

    return this.prisma.groupMember.update({
      where: { id: memberId },
      data: { role: updateMemberRoleDto.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async checkManagerPermission(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (!member || member.role !== Role.MANAGER || member.endDate !== null) {
      throw new ForbiddenException('Only managers can perform this action');
    }

    return member;
  }

  async checkMembershipAndGetRole(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (!member || member.endDate !== null) {
      throw new ForbiddenException('You are not a member of this group');
    }

    return member;
  }

}
