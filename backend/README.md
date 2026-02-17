# 🔧 Backend API - Plateforme de Gestion de Cotisations

Je maintiens cette API REST NestJS pour gérer les cotisations collaboratives.

## 📋 Prérequis

- Node.js 20+ et npm
- PostgreSQL 14+
- Git

## 🚀 Installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configuration de l'environnement

Copier le fichier `.env.example` vers `.env` :

```bash
cp .env.example .env
```

Configurer les variables d'environnement dans `.env` :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cotisations_db?schema=public"

# JWT
JWT_SECRET="change-me-with-a-strong-secret"
JWT_REFRESH_SECRET="change-me-with-a-strong-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=development

# CORS (plusieurs domaines autorisés séparés par des virgules)
CORS_ORIGIN="http://localhost:5173"

# Rate limiting (global)
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=120
```

Important: la valeur `DATABASE_URL` doit contenir un utilisateur PostgreSQL existant avec accès à la base `cotisations_db`. La valeur de l'exemple (`user:password`) est un exemple.

### 3. Configuration de la base de données

#### Créer la base de données PostgreSQL

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE cotisations_db;

# Quitter psql
\q
```

#### Exécuter les migrations Prisma

```bash
# Générer le client Prisma
npm run prisma:generate

# Exécuter les migrations
npm run prisma:migrate

# (Optionnel) Ouvrir Prisma Studio pour visualiser la base
npm run prisma:studio
```

## 🏃 Démarrage

### Mode développement

```bash
npm run start:dev
```

Si l'API échoue au démarrage avec Prisma `P1010` (access denied), corrigez les identifiants dans `.env` puis relancez.

L'API sera accessible sur `http://localhost:3000/api`

### Mode production

```bash
npm run build
npm run start:prod
```

Checklist prod publique:
- définir `NODE_ENV=production`
- remplacer les secrets JWT par des valeurs robustes
- limiter `CORS_ORIGIN` au(x) domaine(s) frontend
- activer HTTPS via reverse proxy
- exécuter migrations Prisma sur la base cible
- vérifier la sonde: `GET /api/health`

## 📚 Documentation de l'API

### Santé

```http
GET /api/health
```

Réponse:

```json
{
  "status": "ok",
  "timestamp": "2026-02-17T16:00:00.000Z",
  "uptimeSeconds": 1234
}
```

### Authentification

#### Inscription

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Réponse :**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "name": "John Doe"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

Règles:
- `email` est unique sur toute la base.
- l'email est normalisé (`trim + lowercase`) à l'inscription et à la connexion.

#### Connexion

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Rafraîchir le token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Déconnexion

```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
```

#### Obtenir mes informations

```http
GET /api/auth/me
Authorization: Bearer {accessToken}
```

---

### Groupes

#### Créer un groupe

```http
POST /api/groups
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Famille Dupont",
  "description": "Cotisation familiale mensuelle"
}
```

Comportement V1:
- tout utilisateur authentifié peut créer un groupe,
- le créateur devient automatiquement `MANAGER`,
- `createdBy` est enregistré sur le groupe,
- un groupe peut être créé vide (sans cotisation).

#### Lister mes groupes

```http
GET /api/groups
Authorization: Bearer {accessToken}
```

Filtre optionnel:

```http
GET /api/groups?createdByMe=true
Authorization: Bearer {accessToken}
```

#### Obtenir les détails d'un groupe

```http
GET /api/groups/{groupId}
Authorization: Bearer {accessToken}
```

#### Ajouter un membre (Manager uniquement)

```http
POST /api/groups/{groupId}/members
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "email": "member@example.com",
  "role": "MEMBER"
}
```

L'ajout direct démarre immédiatement l'adhésion au groupe.

#### Inviter un membre (Manager uniquement)

```http
POST /api/groups/{groupId}/invitations
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "email": "member@example.com",
  "role": "MEMBER"
}
```

Note: pour les invitations de groupe, le mode de démarrage est géré côté serveur (immédiat en V1).

#### Lister les invitations en attente (Manager uniquement)

```http
GET /api/groups/{groupId}/invitations
Authorization: Bearer {accessToken}
```

#### Accepter une invitation (membre invité)

```http
POST /api/groups/invitations/accept
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "token": "uuid-token-recu"
}
```

Règles V1 appliquées:
- seul un manager peut inviter/ajouter,
- adhésion par invitation = 2 étapes (inviter puis accepter),
- `(user, group)` reste unique,
- impossible de rétrograder le dernier manager d'un groupe.

#### Modifier le rôle d'un membre (Manager uniquement)

```http
PATCH /api/groups/{groupId}/members/{memberId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "role": "MANAGER"
}
```

---

### Administration Utilisateurs (Admin plateforme)

#### Lister les comptes

```http
GET /api/users/admin/accounts
Authorization: Bearer {accessToken}
```

#### Lister les demandes de réinitialisation en attente

```http
GET /api/users/admin/password-reset-requests
Authorization: Bearer {accessToken}
```

#### Créer une demande de réinitialisation (publique)

```http
POST /api/users/password-reset-requests
Content-Type: application/json

{
  "email": "user@example.com",
  "note": "Optionnel"
}
```

#### Réinitialiser le mot de passe d'un compte

```http
POST /api/users/admin/reset-password
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "userId": "uuid-user",
  "newPassword": "nouveauMotDePasse123",
  "requestId": "uuid-request-optionnel"
}
```

#### Refuser une demande de réinitialisation

```http
POST /api/users/admin/password-reset-requests/{requestId}/reject
Authorization: Bearer {accessToken}
```

Comportement:
- réservé aux comptes `isAdmin=true`,
- le mot de passe est re-hashé serveur,
- `refreshToken` est invalidé (déconnexion forcée des sessions actives).

---

### Cotisations

#### Créer une cotisation (Manager uniquement)

```http
POST /api/contributions/groups/{groupId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Cotisation Mensuelle",
  "description": "Pour les dépenses communes",
  "amount": 50,
  "currency": "EUR",
  "frequency": "MONTHLY",
  "dueDay": 5,
  "firstPeriodDate": "2026-03-01",
  "durationPeriods": 12,
  "inviteScope": "ALL",
  "invitationStartMode": "NEXT_PERIOD"
}
```

Champs importants:
- `frequency`: `MONTHLY` | `QUARTERLY` | `DELAY`
- `firstPeriodDate` (optionnel, hors `DELAY`): date de début de la 1ère période
- `inviteScope`: `ALL` (tous les membres du groupe) ou `SELECTED`
- `invitedUserIds`: requis si `inviteScope=SELECTED`
- `invitationStartMode`: `CURRENT_PERIOD` | `NEXT_PERIOD` | `CATCH_UP`

#### Lister les cotisations d'un groupe

```http
GET /api/contributions/groups/{groupId}
Authorization: Bearer {accessToken}
```

#### Obtenir les détails d'une cotisation

```http
GET /api/contributions/{contributionId}
Authorization: Bearer {accessToken}
```

#### Modifier une cotisation (Manager uniquement)

```http
PATCH /api/contributions/{contributionId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "amount": 75,
  "dueDay": 10
}
```

#### Ajouter un membre à une cotisation (Manager uniquement)

```http
POST /api/contributions/{contributionId}/members
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "userId": "user-uuid",
  "startMode": "NEXT_PERIOD"
}
```

#### Inviter des membres à une cotisation (Manager uniquement)

```http
POST /api/contributions/{contributionId}/invitations
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "userIds": ["user-uuid-1", "user-uuid-2"],
  "startMode": "CATCH_UP"
}
```

#### Lister les invitations d'une cotisation (Manager uniquement)

```http
GET /api/contributions/{contributionId}/invitations
Authorization: Bearer {accessToken}
```

#### Lister mes invitations de cotisation

```http
GET /api/contributions/invitations/me
Authorization: Bearer {accessToken}
```

#### Accepter une invitation de cotisation

```http
POST /api/contributions/invitations/accept
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "token": "uuid-token-recu"
}
```

#### Refuser une invitation de cotisation

```http
POST /api/contributions/invitations/{invitationId}/decline
Authorization: Bearer {accessToken}
```

#### Obtenir le solde d'un membre

```http
GET /api/contributions/{contributionId}/balance/{userId}
Authorization: Bearer {accessToken}
```

---

### Paiements

#### Déclarer un paiement (Membre)

```http
POST /api/payments/contributions/{contributionId}/declare
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "amount": 150,
  "proofUrl": "https://example.com/receipt.jpg",
  "note": "Paiement pour janvier-mars"
}
```

#### Enregistrer un paiement direct (Manager uniquement)

```http
POST /api/payments/contributions/{contributionId}/direct
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "userId": "user-uuid",
  "amount": 50,
  "note": "Paiement en espèces"
}
```

#### Valider/Rejeter un paiement (Manager uniquement)

```http
PATCH /api/payments/{paymentId}/validate
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "approve": true
}
```

#### Lister les paiements en attente (Manager uniquement)

```http
GET /api/payments/contributions/{contributionId}/pending
Authorization: Bearer {accessToken}
```

#### Obtenir l'historique des paiements d'un utilisateur

```http
GET /api/payments/contributions/{contributionId}/user/{userId}
Authorization: Bearer {accessToken}
```

#### Notifications paiements à traiter (Manager)

```http
GET /api/payments/notifications/manager-pending
Authorization: Bearer {accessToken}
```

#### Notifications validations/refus (Membre)

```http
GET /api/payments/notifications/my-updates?since=2026-02-17T10:00:00.000Z
Authorization: Bearer {accessToken}
```

---

### Dashboard

#### Dashboard Membre

```http
GET /api/dashboard/groups/{groupId}/member
Authorization: Bearer {accessToken}
```

**Réponse :**
```json
{
  "contributions": [
    {
      "id": "uuid",
      "name": "Cotisation Mensuelle",
      "amount": 50,
      "currency": "EUR",
      "balance": {
        "expected": 150,
        "paid": 150,
        "balance": 0
      }
    }
  ],
  "recentPayments": [...]
}
```

#### Dashboard Gestionnaire

```http
GET /api/dashboard/groups/{groupId}/manager
Authorization: Bearer {accessToken}
```

**Réponse :**
```json
{
  "group": {...},
  "contributionsStats": [
    {
      "id": "uuid",
      "name": "Cotisation Mensuelle",
      "currency": "EUR",
      "expectedTotal": 450,
      "collectedTotal": 400,
      "deficit": 50,
      "pendingPayments": 1,
      "members": [
        {
          "user": {...},
          "balance": {
            "expected": 150,
            "paid": 100,
            "balance": -50
          }
        }
      ]
    }
  ]
}
```

---

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests E2E
npm run test:e2e

# Coverage
npm run test:cov
```

## 🗄️ Base de Données

### Modèle de données

- **User** : Utilisateur de la plateforme
- champs principaux : `email` (unique), `firstName`, `lastName`, `name`
- **Group** : Groupe de cotisation
- **GroupMember** : Association utilisateur-groupe avec rôle (MEMBER / MANAGER)
- **Contribution** : Caisse de cotisation avec montant et fréquence
- **ContributionMember** : Association membre-cotisation avec date de début
- **Period** : Période de cotisation (mois/année) avec montant figé
- **Payment** : Paiement effectué par un membre (statut : DECLARED / APPROVED / REJECTED / DIRECT)

### Commandes Prisma utiles

```bash
# Générer le client Prisma après modification du schema
npm run prisma:generate

# Créer une nouvelle migration
npx prisma migrate dev --name nom_migration

# Réinitialiser la base de données (⚠️ perte de données)
npx prisma migrate reset

# Ouvrir Prisma Studio
npm run prisma:studio
```

## 📁 Structure du Projet

```
backend/
├── prisma/
│   └── schema.prisma         # Schéma de la base de données
├── src/
│   ├── modules/
│   │   ├── auth/            # Authentification (JWT)
│   │   ├── users/           # Gestion des utilisateurs
│   │   ├── groups/          # Gestion des groupes
│   │   ├── contributions/   # Gestion des cotisations
│   │   ├── payments/        # Gestion des paiements
│   │   ├── dashboard/       # Dashboard membre/manager
│   │   └── prisma/          # Service Prisma global
│   ├── app.module.ts        # Module principal
│   └── main.ts              # Point d'entrée
├── test/                    # Tests E2E
└── package.json
```

## 🔒 Sécurité

- Mots de passe hashés avec bcrypt (12 rounds)
- JWT avec access token (15 min) et refresh token (7 jours)
- Guards NestJS pour la protection des routes
- Validation des données avec class-validator
- Validation stricte des variables d'environnement au démarrage
- CORS configuré (multi-origins possible)
- Rate limiting global (Nest Throttler)
- Helmet + désactivation `x-powered-by`
- Logs structurés JSON avec `x-request-id` par requête
- Protection contre les injections SQL (Prisma)

## 🐛 Débogage

### Logs

Les logs HTTP sont structurés en JSON (méthode, path, status, durée, IP, user-agent, request-id).

### Prisma Studio

Pour visualiser et éditer les données directement :

```bash
npm run prisma:studio
```

Accessible sur `http://localhost:5555`

---

## ✅ Statut du Backend

### ✅ Implémenté

- [x] Authentification complète (JWT)
- [x] Gestion des utilisateurs
- [x] Gestion des groupes (création, membres, rôles)
- [x] Gestion des cotisations (création, modification)
- [x] Système de périodes automatiques
- [x] Double workflow de paiement (déclaration + direct)
- [x] Validation des paiements
- [x] Calcul des soldes (avances/retards)
- [x] Dashboard membre
- [x] Dashboard gestionnaire
- [x] Rate limiting global
- [x] Logging structuré par requête

### 🚧 À Implémenter (V2+)

- [ ] Système de notifications
- [ ] Export de données (PDF, Excel)
- [ ] Historique des modifications
- [ ] Gestion des pièces jointes
- [ ] API de webhooks

---

**Version:** 1.0.0  
**Dernière mise à jour:** Février 2026
