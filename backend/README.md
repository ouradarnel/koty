# Backend Koty

API NestJS pour la gestion des comptes, groupes, cotisations, invitations et paiements.

## Prérequis

- Node.js 20+
- npm
- PostgreSQL 14+

## Installation

```bash
npm install
cp .env.example .env
```

Exemple de configuration :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/koty_db?schema=public"

JWT_SECRET="a-remplacer"
JWT_REFRESH_SECRET="a-remplacer"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"

THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=120
```

## Base de données

```bash
npm run prisma:generate
npm run prisma:migrate
```

Je peux ensuite injecter des données de test :

```bash
npm run prisma:seed
```

Le seed standard crée aussi un compte test public :

- email : `demo@koty.local`
- mot de passe : `KotyDemo123!`

Tu peux changer ce mot de passe avec la variable :

```env
KOTY_PUBLIC_DEMO_PASSWORD="votre-mot-de-passe-demo"
```

Ou une charge plus importante :

```bash
npm run prisma:seed:stress
```

## Lancement

Développement :

```bash
npm run start:dev
```

Production :

```bash
npm run build
npm run start:prod
```

Point de santé :

```http
GET /api/health
```

## Endpoints principaux

### Authentification

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Groupes

- `GET /api/groups`
- `GET /api/groups?createdByMe=true`
- `POST /api/groups`
- `GET /api/groups/:id`
- `POST /api/groups/:id/invitations`
- `GET /api/groups/:id/invitations`
- `GET /api/groups/invitations/me`
- `POST /api/groups/invitations/accept`
- `POST /api/groups/invitations/:invitationId/decline`
- `PATCH /api/groups/:groupId/members/:memberId`

### Cotisations

- `GET /api/contributions/groups/:groupId`
- `POST /api/contributions/groups/:groupId`
- `GET /api/contributions/:id`
- `PATCH /api/contributions/:id`
- `POST /api/contributions/:id/members`
- `POST /api/contributions/:id/invitations`
- `GET /api/contributions/:id/invitations`
- `GET /api/contributions/invitations/me`
- `POST /api/contributions/invitations/accept`
- `POST /api/contributions/invitations/:invitationId/decline`
- `GET /api/contributions/:id/balance/:userId`

### Paiements

- `POST /api/payments/contributions/:contributionId/declare`
- `POST /api/payments/contributions/:contributionId/direct`
- `PATCH /api/payments/:paymentId/validate`
- `GET /api/payments/contributions/:contributionId/pending`
- `GET /api/payments/contributions/:contributionId/user/:userId`
- `GET /api/payments/notifications/manager-pending`
- `GET /api/payments/notifications/my-updates`

### Dashboard

- `GET /api/dashboard/groups/:groupId/member`
- `GET /api/dashboard/groups/:groupId/manager`

## Vérifications

```bash
npm run lint
npm run build
npm run test -- --runInBand
npm run test:e2e -- --runInBand
```
