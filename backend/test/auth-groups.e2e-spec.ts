import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

type AuthResponse = {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
};

type GroupResponse = { id: string; name: string; description?: string | null };

describe('E2E auth + group invitation flow', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let baseUrl = '';

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const ownerEmail = `owner.auth.${suffix}@test.local`;
  const invitedEmail = `invited.auth.${suffix}@test.local`;
  const outsiderEmail = `outsider.auth.${suffix}@test.local`;
  const password = 'test1234';

  let ownerAuth: AuthResponse;
  let invitedAuth: AuthResponse;
  let outsiderAuth: AuthResponse;
  let groupId = '';

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
          email: ownerEmail,
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [ownerEmail, invitedEmail, outsiderEmail],
        },
      },
    });

    await prisma.$disconnect();
    await app.close();
  });

  it('supports register/login and group invitation acceptance lifecycle', async () => {
    const ownerRegister = await callApi<AuthResponse>('/auth/register', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        email: ownerEmail,
        password,
        firstName: 'Owner',
        lastName: 'Auth',
      }),
    });
    expect(ownerRegister.status).toBe(201);
    ownerAuth = ownerRegister.body;

    const duplicateOwnerRegister = await callApi<{ statusCode: number; message: string }>('/auth/register', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        email: ownerEmail,
        password,
        firstName: 'Owner',
        lastName: 'Auth',
      }),
    });
    expect(duplicateOwnerRegister.status).toBe(409);

    const loginOwner = await callApi<AuthResponse>('/auth/login', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        email: ownerEmail,
        password,
      }),
    });
    expect(loginOwner.status).toBe(201);
    expect(loginOwner.body.accessToken).toBeDefined();

    const createGroup = await callApi<GroupResponse>('/groups', {
      method: 'POST',
      headers: jsonHeaders(ownerAuth.accessToken),
      body: JSON.stringify({
        name: `Groupe auth ${suffix}`,
        description: 'Flow invitation',
      }),
    });
    expect(createGroup.status).toBe(201);
    groupId = createGroup.body.id;

    const invitedRegister = await callApi<AuthResponse>('/auth/register', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        email: invitedEmail,
        password,
        firstName: 'Invited',
        lastName: 'Auth',
      }),
    });
    expect(invitedRegister.status).toBe(201);
    invitedAuth = invitedRegister.body;

    const outsiderRegister = await callApi<AuthResponse>('/auth/register', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        email: outsiderEmail,
        password,
        firstName: 'Outsider',
        lastName: 'Auth',
      }),
    });
    expect(outsiderRegister.status).toBe(201);
    outsiderAuth = outsiderRegister.body;

    const sendInvitation = await callApi<{ id: string; status: string }>(`/groups/${groupId}/invitations`, {
      method: 'POST',
      headers: jsonHeaders(ownerAuth.accessToken),
      body: JSON.stringify({
        email: invitedEmail,
        role: 'MEMBER',
      }),
    });
    expect(sendInvitation.status).toBe(201);

    const invitedPending = await callApi<Array<{ id: string; token: string; groupId: string }>>('/groups/invitations/me', {
      method: 'GET',
      headers: jsonHeaders(invitedAuth.accessToken),
    });
    expect(invitedPending.status).toBe(200);
    const invitation = invitedPending.body.find((item) => item.groupId === groupId);
    expect(invitation?.token).toBeDefined();

    const acceptInvitation = await callApi<{ id: string; groupId: string }>('/groups/invitations/accept', {
      method: 'POST',
      headers: jsonHeaders(invitedAuth.accessToken),
      body: JSON.stringify({
        token: invitation?.token,
      }),
    });
    expect(acceptInvitation.status).toBe(201);

    const invitedGroups = await callApi<Array<{ id: string }>>('/groups', {
      method: 'GET',
      headers: jsonHeaders(invitedAuth.accessToken),
    });
    expect(invitedGroups.status).toBe(200);
    expect(invitedGroups.body.some((item) => item.id === groupId)).toBe(true);

    const outsiderGroupAccess = await callApi<{ statusCode: number; message: string }>(`/groups/${groupId}`, {
      method: 'GET',
      headers: jsonHeaders(outsiderAuth.accessToken),
    });
    expect([403, 404]).toContain(outsiderGroupAccess.status);
  });
});
