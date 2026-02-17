import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

type AuthPayload = {
  user: { id: string; email: string; firstName?: string; lastName?: string; name?: string };
  accessToken: string;
  refreshToken: string;
};

describe('E2E group/contribution/payment flow', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let baseUrl = '';

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const managerEmail = `manager.e2e.${suffix}@test.local`;
  const memberEmail = `member.e2e.${suffix}@test.local`;
  const password = 'test1234';

  let managerAuth: AuthPayload;
  let memberAuth: AuthPayload;
  let groupId = '';
  let contributionOpenId = '';
  let contributionPrivateId = '';

  const jsonHeaders = (token?: string) => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  async function callApi<T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T }> {
    const response = await fetch(`${baseUrl}/api${path}`, init);
    const text = await response.text();
    const body = text ? (JSON.parse(text) as T) : ({} as T);
    return { status: response.status, body };
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-jwt-secret';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'e2e-refresh-secret';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();
    await app.listen(0);
    baseUrl = await app.getUrl();

    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.group.deleteMany({
      where: {
        createdBy: {
          email: managerEmail,
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [managerEmail, memberEmail],
        },
      },
    });

    await prisma.$disconnect();
    await app.close();
  });

  it('enforce participation visibility and payment workflow', async () => {
    const registerManager = await callApi<AuthPayload>('/auth/register', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        email: managerEmail,
        password,
        firstName: 'Manager',
        lastName: 'E2E',
      }),
    });
    expect(registerManager.status).toBe(201);
    managerAuth = registerManager.body;

    const registerMember = await callApi<AuthPayload>('/auth/register', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        email: memberEmail,
        password,
        firstName: 'Member',
        lastName: 'E2E',
      }),
    });
    expect(registerMember.status).toBe(201);
    memberAuth = registerMember.body;

    const createGroup = await callApi<{ id: string }>('/groups', {
      method: 'POST',
      headers: jsonHeaders(managerAuth.accessToken),
      body: JSON.stringify({
        name: `Groupe e2e ${suffix}`,
        description: 'Test visibilité cotisations',
      }),
    });
    expect(createGroup.status).toBe(201);
    groupId = createGroup.body.id;

    const inviteMemberToGroup = await callApi<{ id: string }>('/groups/' + groupId + '/invitations', {
      method: 'POST',
      headers: jsonHeaders(managerAuth.accessToken),
      body: JSON.stringify({
        email: memberEmail,
        role: 'MEMBER',
      }),
    });
    expect(inviteMemberToGroup.status).toBe(201);

    const memberGroupInvitations = await callApi<Array<{ id: string; token: string; groupId: string }>>('/groups/invitations/me', {
      method: 'GET',
      headers: jsonHeaders(memberAuth.accessToken),
    });
    expect(memberGroupInvitations.status).toBe(200);
    const groupInvitation = memberGroupInvitations.body.find((item) => item.groupId === groupId);
    expect(groupInvitation?.token).toBeDefined();

    const acceptGroupInvitation = await callApi('/groups/invitations/accept', {
      method: 'POST',
      headers: jsonHeaders(memberAuth.accessToken),
      body: JSON.stringify({
        token: groupInvitation?.token,
      }),
    });
    expect(acceptGroupInvitation.status).toBe(201);

    const createOpenContribution = await callApi<{ id: string }>('/contributions/groups/' + groupId, {
      method: 'POST',
      headers: jsonHeaders(managerAuth.accessToken),
      body: JSON.stringify({
        name: 'Cotisation ouverte',
        description: 'Visible pour le membre',
        amount: 25,
        currency: 'USD',
        frequency: 'MONTHLY',
        dueDay: 5,
        firstPeriodDate: '2026-01-01',
        inviteScope: 'SELECTED',
        invitedUserIds: [memberAuth.user.id],
        invitationStartMode: 'CURRENT_PERIOD',
      }),
    });
    expect(createOpenContribution.status).toBe(201);
    contributionOpenId = createOpenContribution.body.id;

    const createPrivateContribution = await callApi<{ id: string }>('/contributions/groups/' + groupId, {
      method: 'POST',
      headers: jsonHeaders(managerAuth.accessToken),
      body: JSON.stringify({
        name: 'Cotisation privée manager',
        description: 'Non visible pour le membre',
        amount: 40,
        currency: 'USD',
        frequency: 'MONTHLY',
        dueDay: 8,
        firstPeriodDate: '2026-01-01',
        inviteScope: 'SELECTED',
        invitedUserIds: [managerAuth.user.id],
        invitationStartMode: 'CURRENT_PERIOD',
      }),
    });
    expect(createPrivateContribution.status).toBe(201);
    contributionPrivateId = createPrivateContribution.body.id;

    const memberContributionInvitations = await callApi<Array<{ token: string; contributionId: string }>>('/contributions/invitations/me', {
      method: 'GET',
      headers: jsonHeaders(memberAuth.accessToken),
    });
    expect(memberContributionInvitations.status).toBe(200);
    const contributionInvitation = memberContributionInvitations.body.find(
      (item) => item.contributionId === contributionOpenId,
    );
    expect(contributionInvitation?.token).toBeDefined();

    const acceptContributionInvitation = await callApi('/contributions/invitations/accept', {
      method: 'POST',
      headers: jsonHeaders(memberAuth.accessToken),
      body: JSON.stringify({
        token: contributionInvitation?.token,
      }),
    });
    expect(acceptContributionInvitation.status).toBe(201);

    const memberGroupDetails = await callApi<{ contributions: Array<{ id: string; name: string }> }>(`/groups/${groupId}`, {
      method: 'GET',
      headers: jsonHeaders(memberAuth.accessToken),
    });
    expect(memberGroupDetails.status).toBe(200);
    expect(memberGroupDetails.body.contributions).toHaveLength(1);
    expect(memberGroupDetails.body.contributions[0].id).toBe(contributionOpenId);

    const managerGroupDetails = await callApi<{ contributions: Array<{ id: string }> }>(`/groups/${groupId}`, {
      method: 'GET',
      headers: jsonHeaders(managerAuth.accessToken),
    });
    expect(managerGroupDetails.status).toBe(200);
    expect(managerGroupDetails.body.contributions).toHaveLength(2);

    const declareOnOpenContribution = await callApi<{ id: string; status: string }>(
      `/payments/contributions/${contributionOpenId}/declare`,
      {
        method: 'POST',
        headers: jsonHeaders(memberAuth.accessToken),
        body: JSON.stringify({
          amount: 30,
          note: 'Paiement E2E validé',
        }),
      },
    );
    expect(declareOnOpenContribution.status).toBe(201);
    expect(declareOnOpenContribution.body.status).toBe('DECLARED');

    const declareOnPrivateContribution = await callApi<{ statusCode: number; message: string }>(
      `/payments/contributions/${contributionPrivateId}/declare`,
      {
        method: 'POST',
        headers: jsonHeaders(memberAuth.accessToken),
        body: JSON.stringify({
          amount: 10,
        }),
      },
    );
    expect(declareOnPrivateContribution.status).toBe(403);

    const validateDeclaredPayment = await callApi<{ id: string; status: string }>(
      `/payments/${declareOnOpenContribution.body.id}/validate`,
      {
        method: 'PATCH',
        headers: jsonHeaders(managerAuth.accessToken),
        body: JSON.stringify({
          approve: true,
        }),
      },
    );
    expect(validateDeclaredPayment.status).toBe(200);
    expect(validateDeclaredPayment.body.status).toBe('APPROVED');

    const secondDeclaredPayment = await callApi<{ id: string; status: string }>(
      `/payments/contributions/${contributionOpenId}/declare`,
      {
        method: 'POST',
        headers: jsonHeaders(memberAuth.accessToken),
        body: JSON.stringify({
          amount: 12,
          note: 'Paiement E2E rejeté',
        }),
      },
    );
    expect(secondDeclaredPayment.status).toBe(201);

    const rejectSecondPayment = await callApi<{ id: string; status: string }>(
      `/payments/${secondDeclaredPayment.body.id}/validate`,
      {
        method: 'PATCH',
        headers: jsonHeaders(managerAuth.accessToken),
        body: JSON.stringify({
          approve: false,
        }),
      },
    );
    expect(rejectSecondPayment.status).toBe(200);
    expect(rejectSecondPayment.body.status).toBe('REJECTED');

    const memberBalance = await callApi<{ expected: number; paid: number; balance: number }>(
      `/contributions/${contributionOpenId}/balance/${memberAuth.user.id}`,
      {
        method: 'GET',
        headers: jsonHeaders(memberAuth.accessToken),
      },
    );
    expect(memberBalance.status).toBe(200);
    expect(Number(memberBalance.body.paid)).toBe(30);
  });
});
