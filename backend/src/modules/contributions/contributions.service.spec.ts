import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Role } from '@prisma/client';
import { ContributionsService } from './contributions.service';

function createPrismaMock() {
  return {
    contribution: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    period: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
  };
}

describe('ContributionsService.calculateBalance', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let groupsService: {
    checkManagerPermission: jest.Mock;
    checkMembershipAndGetRole: jest.Mock;
  };
  let service: ContributionsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    groupsService = {
      checkManagerPermission: jest.fn(),
      checkMembershipAndGetRole: jest.fn(),
    };
    service = new ContributionsService(prisma as never, groupsService as never);
  });

  it('calcule expected/paid/balance en ne comptant que APPROVED + DIRECT', async () => {
    prisma.contribution.findUnique
      .mockResolvedValueOnce({
        id: 'c1',
        group: {
          members: [{ userId: 'u1', role: Role.MEMBER }],
        },
      })
      .mockResolvedValueOnce({
        id: 'c1',
        members: [{ startDate: new Date('2026-02-01T00:00:00Z'), endDate: null }],
      });

    prisma.period.findMany.mockResolvedValue([
      { dueDate: new Date('2026-01-05T00:00:00Z'), amount: 10 },
      { dueDate: new Date('2026-02-05T00:00:00Z'), amount: 10 },
      { dueDate: new Date('2026-03-05T00:00:00Z'), amount: 10 },
    ]);

    prisma.payment.findMany.mockResolvedValue([{ amount: 5 }, { amount: 20 }]);

    const result = await service.calculateBalance('c1', 'u1');

    expect(prisma.payment.findMany).toHaveBeenCalledWith({
      where: {
        contributionId: 'c1',
        userId: 'u1',
        status: {
          in: [PaymentStatus.APPROVED, PaymentStatus.DIRECT],
        },
      },
    });
    expect(result).toEqual({
      expected: 20,
      paid: 25,
      balance: 5,
    });
  });

  it("refuse la consultation du solde d'un autre membre si le demandeur n'est pas manager", async () => {
    prisma.contribution.findUnique.mockResolvedValue({
      id: 'c1',
      group: {
        members: [{ userId: 'u1', role: Role.MEMBER }],
      },
    });

    await expect(service.calculateBalance('c1', 'u2', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('retourne zéro si le membre ne participe pas à cette cotisation', async () => {
    prisma.contribution.findUnique
      .mockResolvedValueOnce({
        id: 'c1',
        group: {
          members: [{ userId: 'u1', role: Role.MANAGER }],
        },
      })
      .mockResolvedValueOnce({
        id: 'c1',
        members: [],
      });

    prisma.period.findMany.mockResolvedValue([]);

    const result = await service.calculateBalance('c1', 'u2', 'u1');

    expect(result).toEqual({
      expected: 0,
      paid: 0,
      balance: 0,
    });
  });
});

describe('ContributionsService visibility', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let groupsService: {
    checkManagerPermission: jest.Mock;
    checkMembershipAndGetRole: jest.Mock;
  };
  let service: ContributionsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    groupsService = {
      checkManagerPermission: jest.fn(),
      checkMembershipAndGetRole: jest.fn(),
    };
    service = new ContributionsService(prisma as never, groupsService as never);
  });

  it('findAll limite les résultats aux cotisations participées pour un membre non manager', async () => {
    groupsService.checkMembershipAndGetRole.mockResolvedValue({ role: Role.MEMBER });
    prisma.contribution.findMany.mockResolvedValue([]);

    await service.findAll('g1', 'u1');

    expect(prisma.contribution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          groupId: 'g1',
          members: {
            some: {
              endDate: null,
              member: {
                userId: 'u1',
                endDate: null,
              },
            },
          },
        }),
      }),
    );
  });

  it("findOne refuse l'accès si un membre n'est pas participant à la cotisation", async () => {
    prisma.contribution.findUnique.mockResolvedValue({
      id: 'c1',
      group: {
        members: [{ userId: 'u1', role: Role.MEMBER, endDate: null }],
      },
      members: [],
    });

    await expect(service.findOne('c1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
