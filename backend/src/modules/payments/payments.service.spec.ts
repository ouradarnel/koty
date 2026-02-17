import { ForbiddenException } from '@nestjs/common';
import { PaymentStatus, Role } from '@prisma/client';
import { PaymentsService } from './payments.service';

function createPrismaMock() {
  return {
    contribution: {
      findUnique: jest.fn(),
    },
    contributionMember: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    groupMember: {
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    period: {
      findMany: jest.fn(),
    },
  };
}

describe('PaymentsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let groupsService: { checkManagerPermission: jest.Mock };
  let service: PaymentsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    groupsService = {
      checkManagerPermission: jest.fn(),
    };
    service = new PaymentsService(prisma as never, groupsService as never);
  });

  it('déclare un paiement membre en statut DECLARED', async () => {
    prisma.contribution.findUnique.mockResolvedValue({
      id: 'c1',
      group: {
        members: [{ userId: 'u1' }],
      },
    });
    prisma.contributionMember.findFirst.mockResolvedValue({ id: 'cm1' });
    prisma.payment.create.mockResolvedValue({ id: 'p1', status: PaymentStatus.DECLARED });

    await service.declarePayment('c1', 'u1', { amount: 20, note: 'test' });

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        contributionId: 'c1',
        amount: 20,
        proofUrl: undefined,
        note: 'test',
        status: PaymentStatus.DECLARED,
      },
    });
  });

  it("refuse la déclaration si l'utilisateur ne participe pas à la cotisation", async () => {
    prisma.contribution.findUnique.mockResolvedValue({
      id: 'c1',
      group: {
        members: [{ userId: 'u1' }],
      },
    });
    prisma.contributionMember.findFirst.mockResolvedValue(null);

    await expect(service.declarePayment('c1', 'u1', { amount: 20 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('enregistre un paiement direct en statut DIRECT', async () => {
    prisma.contribution.findUnique.mockResolvedValue({
      id: 'c1',
      groupId: 'g1',
      group: { id: 'g1' },
    });
    prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm2' });
    prisma.contributionMember.findUnique.mockResolvedValue({ id: 'cm2' });
    prisma.payment.create.mockResolvedValue({ id: 'p2', status: PaymentStatus.DIRECT });

    await service.directPayment('c1', 'manager1', { userId: 'u2', amount: 50, note: 'cash' });

    expect(groupsService.checkManagerPermission).toHaveBeenCalledWith('g1', 'manager1');
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        userId: 'u2',
        contributionId: 'c1',
        amount: 50,
        note: 'cash',
        status: PaymentStatus.DIRECT,
        validatedAt: expect.any(Date),
        validatedBy: 'manager1',
      },
    });
  });

  it('valide un paiement DECLARED vers APPROVED', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'p1',
      status: PaymentStatus.DECLARED,
      contribution: { groupId: 'g1', group: { id: 'g1' } },
    });
    prisma.payment.update.mockResolvedValue({ id: 'p1', status: PaymentStatus.APPROVED });

    await service.validatePayment('p1', 'manager1', { approve: true });

    expect(groupsService.checkManagerPermission).toHaveBeenCalledWith('g1', 'manager1');
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: {
        status: PaymentStatus.APPROVED,
        validatedAt: expect.any(Date),
        validatedBy: 'manager1',
      },
    });
  });

  it('refuse la validation si le paiement est déjà traité', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'p1',
      status: PaymentStatus.APPROVED,
      contribution: { groupId: 'g1', group: { id: 'g1' } },
    });

    await expect(service.validatePayment('p1', 'manager1', { approve: true })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse l'accès aux paiements d'un autre membre si le demandeur n'est pas manager", async () => {
    prisma.contribution.findUnique.mockResolvedValue({
      id: 'c1',
      group: {
        members: [
          { userId: 'requester', role: Role.MEMBER },
          { userId: 'target', role: Role.MEMBER },
        ],
      },
    });

    await expect(service.getUserPayments('c1', 'target', 'requester')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('liste les notifications manager de paiements en attente', async () => {
    prisma.payment.findMany.mockResolvedValue([{ id: 'p1' }]);

    const result = await service.listManagerPendingNotifications('manager1');

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PaymentStatus.DECLARED,
          contribution: {
            group: {
              members: {
                some: {
                  userId: 'manager1',
                  role: Role.MANAGER,
                  endDate: null,
                },
              },
            },
          },
        }),
      }),
    );
    expect(result).toEqual([{ id: 'p1' }]);
  });

  it('liste les notifications membre après une date since', async () => {
    prisma.payment.findMany.mockResolvedValue([{ id: 'p2' }]);

    const result = await service.listMyPaymentUpdates('u1', '2026-02-01T10:00:00.000Z');

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'u1',
          status: { in: [PaymentStatus.APPROVED, PaymentStatus.REJECTED] },
          validatedAt: expect.objectContaining({ not: null }),
        }),
      }),
    );
    expect(result).toEqual([{ id: 'p2' }]);
  });

});
