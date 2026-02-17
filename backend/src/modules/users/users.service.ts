import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordResetRequestStatus, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    return this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    name: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }

  async listForAdmin() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        isAdmin: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async adminResetPassword(userId: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        password: passwordHash,
        refreshToken: null,
      },
    });
  }

  async createPasswordResetRequestByEmail(email: string, note?: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    const user = await this.findByEmail(normalizedEmail);
    if (!user) return;

    const existingPending = await this.prisma.passwordResetRequest.findFirst({
      where: {
        userId: user.id,
        status: PasswordResetRequestStatus.PENDING,
      },
    });

    if (existingPending) return;

    await this.prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        note: note?.trim() || null,
      },
    });
  }

  async listPendingPasswordResetRequests() {
    return this.prisma.passwordResetRequest.findMany({
      where: {
        status: PasswordResetRequestStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            isAdmin: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async rejectPasswordResetRequest(requestId: string, resolvedById: string) {
    const existing = await this.prisma.passwordResetRequest.findUnique({
      where: { id: requestId },
    });
    if (!existing || existing.status !== PasswordResetRequestStatus.PENDING) {
      return false;
    }

    await this.prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: {
        status: PasswordResetRequestStatus.REJECTED,
        resolvedById,
        resolvedAt: new Date(),
      },
    });
    return true;
  }

  async resolvePasswordResetRequestAfterReset(userId: string, resolvedById: string, requestId?: string) {
    if (requestId) {
      const targetRequest = await this.prisma.passwordResetRequest.findUnique({
        where: { id: requestId },
      });
      if (!targetRequest || targetRequest.status !== PasswordResetRequestStatus.PENDING || targetRequest.userId !== userId) {
        return false;
      }

      await this.prisma.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: PasswordResetRequestStatus.RESOLVED,
          resolvedById,
          resolvedAt: new Date(),
        },
      });
      return true;
    }

    const pending = await this.prisma.passwordResetRequest.findFirst({
      where: {
        userId,
        status: PasswordResetRequestStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!pending) return false;

    await this.prisma.passwordResetRequest.update({
      where: { id: pending.id },
      data: {
        status: PasswordResetRequestStatus.RESOLVED,
        resolvedById,
        resolvedAt: new Date(),
      },
    });
    return true;
  }
}
