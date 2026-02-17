import { NotFoundException } from '@nestjs/common';
import { GroupsService } from './groups.service';

function createPrismaMock() {
  return {
    group: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
}

describe('GroupsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: GroupsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new GroupsService(prisma as never);
  });

  it('filtre les cotisations visibles dans findAll selon rôle/participation', async () => {
    prisma.group.findMany.mockResolvedValue([]);

    await service.findAll('user-1');

    expect(prisma.group.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          contributions: expect.objectContaining({
            where: {
              OR: [
                {
                  group: {
                    members: {
                      some: {
                        userId: 'user-1',
                        role: 'MANAGER',
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
                        userId: 'user-1',
                        endDate: null,
                      },
                    },
                  },
                },
              ],
            },
          }),
        }),
      }),
    );
  });

  it('filtre les cotisations visibles dans findOne selon rôle/participation', async () => {
    prisma.group.findFirst.mockResolvedValue({ id: 'g1' });

    await service.findOne('g1', 'user-1');

    expect(prisma.group.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          contributions: expect.objectContaining({
            where: {
              OR: [
                {
                  group: {
                    members: {
                      some: {
                        userId: 'user-1',
                        role: 'MANAGER',
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
                        userId: 'user-1',
                        endDate: null,
                      },
                    },
                  },
                },
              ],
            },
          }),
        }),
      }),
    );
  });

  it('retourne NotFound si le groupe est introuvable', async () => {
    prisma.group.findFirst.mockResolvedValue(null);

    await expect(service.findOne('g1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
