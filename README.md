# 💰 Plateforme de Gestion de Cotisations Collaboratives

Je développe cette application web pour permettre à des groupes (familles, associations, tontines, amis) de gérer leurs cotisations financières de manière transparente et automatisée.

## 🎯 Fonctionnalités Principales

### ✅ Fonctionnalités Implémentées (V1)

- [x] **Authentification sécurisée** (JWT + Refresh Tokens)
- [x] **Gestion multi-groupes** (un utilisateur peut appartenir à plusieurs groupes)
- [x] **Système de rôles** (Membre / Gestionnaire)
- [x] **Multi-cotisations** (plusieurs caisses par groupe)
- [x] **Gestion des devises** (EUR, XOF, USD, etc.)
- [x] **Périodes automatiques** (génération mensuelle automatique)
- [x] **Double workflow de paiement** (déclaration membre + paiement direct gestionnaire)
- [x] **Calcul automatique des soldes** (avances/retards)
- [x] **Gestion des avances** (paiements couvrant plusieurs mois)
- [x] **Dashboard membre** (API)
- [x] **Dashboard gestionnaire** (API)
- [x] **Validation de paiements** (système d'approbation)
- [x] **Modification sécurisée des montants** (appliquée uniquement au futur)
- [x] **Contrôles d'accès renforcés** (balances/paiements, self ou manager)
- [x] **Reset mot de passe administrateur** (sans fournisseur email)

### ℹ️ État Frontend

- [x] Authentification (login/register/logout)
- [x] Dashboard (vue simplifiée/détaillée + indicateurs retard)
- [x] Gestion des groupes (liste, détail, création, invitation/acceptation)
- [x] Détail cotisation et suivi des paiements
- [x] Navigation responsive (desktop + mobile)

### 🚧 Fonctionnalités Prévues (V2+)

- [ ] Notifications par email/SMS
- [ ] Fréquences multiples (hebdomadaire, trimestrielle, annuelle)
- [ ] Montants différenciés par membre
- [ ] Paiements partiels
- [ ] Export comptable (PDF, Excel)
- [ ] Conversion de devises automatique
- [ ] Historique complet des modifications
- [ ] Application mobile (React Native)
- [ ] Mode SaaS avec paiement par abonnement

## 🏗️ Architecture Technique

### Stack Technologique

**Backend:**
- Node.js 20+
- TypeScript
- NestJS (framework)
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Bcrypt pour les mots de passe

**Frontend:**
- React 18
- TypeScript
- Vite
- TanStack Query (React Query)
- Axios
- shadcn/ui + Tailwind CSS
- React Router DOM

### Structure du Projet

```
cotisations-app/
├── backend/              # API NestJS
│   ├── src/
│   │   ├── modules/      # Modules fonctionnels
│   │   ├── common/       # Utilitaires partagés
│   │   └── main.ts
│   ├── prisma/           # Schema et migrations
│   └── test/             # Tests E2E
│
├── frontend/             # Application React
│   ├── src/
│   │   ├── components/   # Composants réutilisables
│   │   ├── pages/        # Pages de l'application
│   │   ├── hooks/        # Custom hooks
│   │   ├── services/     # API services
│   │   └── types/        # Types TypeScript
│   └── public/
│
└── README.md
```

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 20+ et npm
- PostgreSQL 14+
- Git

### Installation Backend

```bash
cd backend
npm install
cp .env.example .env
# Configurer DATABASE_URL (credentials PostgreSQL valides) et JWT_SECRET dans .env
npx prisma migrate dev
npx prisma generate
npm run start:dev
```

Le backend sera accessible sur `http://localhost:3000`

### Installation Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Configurer VITE_API_URL dans .env (obligatoire en production)
npm run dev
```

Le frontend sera accessible sur `http://localhost:5173`

## 📊 Modèle de Données

### Entités Principales

1. **User** - Utilisateur de la plateforme
2. **Group** - Groupe de cotisation (famille, association, etc.)
3. **GroupMember** - Association utilisateur-groupe avec rôle
4. **Contribution** - Caisse de cotisation (montant, fréquence, devise)
5. **Period** - Période de cotisation (mois/année)
6. **Payment** - Paiement effectué par un membre

Notes User:
- email unique global en base de données,
- profil avec `firstName`, `lastName` et `name` (nom complet affiché).

### Relations

```
User ─────< GroupMember >───── Group
                                  │
                                  └───< Contribution
                                            │
                                            ├───< Period
                                            └───< Payment >──── User
```

## 🔐 Sécurité

- Mots de passe hashés avec bcrypt (12 rounds)
- JWT avec access token (15min) et refresh token (7 jours)
- Guards NestJS pour la protection des routes
- Validation des données avec class-validator
- Validation stricte des variables d'environnement (Joi)
- CORS configuré (origines multiples possibles)
- Helmet pour les headers de sécurité
- Rate limiting global (Nest Throttler)
- Logs requêtes structurés avec `x-request-id`

## 🚀 Go-Live Prod (Résumé)

1. Configurer `backend/.env` avec secrets JWT robustes et `NODE_ENV=production`.
2. Restreindre `CORS_ORIGIN` au(x) domaine(s) publics.
3. Lancer migrations Prisma sur la base de production.
4. Vérifier la sonde: `GET /api/health`.
5. Exécuter avant déploiement:
   - `npm --prefix backend run build && npm --prefix backend test -- --runInBand && npm --prefix backend run test:e2e -- --runInBand`
   - `npm --prefix frontend run lint && npm --prefix frontend run build`

## 🧪 Tests

### Backend
```bash
cd backend
npm run test          # Tests unitaires
npm run test:e2e      # Tests E2E
npm run test:cov      # Coverage
```

### Frontend
```bash
cd frontend
npm run lint
npm run build
```

CI GitHub Actions disponible: `.github/workflows/ci.yml` (lint/build/tests backend+frontend).

## 📝 API Documentation

### Endpoints Principaux

**Authentification**
- `POST /auth/register` - Inscription
- `POST /auth/login` - Connexion
- `POST /auth/refresh` - Rafraîchir le token
- `GET /auth/me` - Profil courant

**Groupes**
- `GET /groups` - Lister les groupes liés à mon compte
- `GET /groups?createdByMe=true` - Lister uniquement les groupes créés par moi
- `POST /groups` - Créer un groupe
- `GET /groups/:id` - Détails d'un groupe
- `POST /groups/:id/members` - Ajouter un membre (gestionnaire)
- `POST /groups/:id/invitations` - Inviter un membre (gestionnaire)
- `GET /groups/invitations/me` - Mes invitations de groupe en attente
- `POST /groups/invitations/accept` - Accepter une invitation de groupe
- `POST /groups/invitations/:invitationId/decline` - Refuser une invitation de groupe

**Cotisations**
- `GET /contributions/groups/:groupId` - Lister les cotisations
- `POST /contributions/groups/:groupId` - Créer une cotisation (gestionnaire)
- `PATCH /contributions/:id` - Modifier une cotisation (gestionnaire)
- `GET /contributions/:id/balance/:userId` - Solde (self ou manager)
- `POST /contributions/:id/invitations` - Inviter des membres à une cotisation
- `GET /contributions/invitations/me` - Mes invitations de cotisation en attente
- `POST /contributions/invitations/accept` - Accepter une invitation de cotisation
- `POST /contributions/invitations/:invitationId/decline` - Refuser une invitation de cotisation

**Paiements**
- `POST /payments/contributions/:contributionId/declare` - Déclarer un paiement (membre)
- `POST /payments/contributions/:contributionId/direct` - Paiement direct (gestionnaire)
- `PATCH /payments/:id/validate` - Valider un paiement (gestionnaire)
- `GET /payments/notifications/manager-pending` - Paiements à valider (gestionnaire)
- `GET /payments/notifications/my-updates` - Mes paiements validés/refusés (membre)

**Dashboard**
- `GET /dashboard/groups/:groupId/member` - Vue membre
- `GET /dashboard/groups/:groupId/manager` - Vue gestionnaire

## 🤝 Contribution

Si je contribue au projet, je suis ce flux :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit mes changements (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT License - voir le fichier `LICENSE` pour plus de détails.

## 👨‍💻 Auteur

Créé dans le cadre d'un projet de gestion financière collaborative.

## 📞 Support

En cas de problème, j'ouvre une issue GitHub.

---

**Version:** 1.0.0  
**Dernière mise à jour:** Février 2026
