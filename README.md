# Koty

Koty est une application de gestion de cotisations pour des groupes privés (famille, amis, association).
Je peux créer des groupes, inviter des membres, créer des cotisations, déclarer des paiements et valider en tant que gestionnaire.

## État actuel (V1)

- Authentification JWT (accès + rafraîchissement)
- Groupes multi-utilisateurs avec rôles `Membre` / `Gestionnaire`
- Invitations de groupe avec acceptation/refus
- Cotisations (mensuelle, trimestrielle, délai)
- Invitations de participation aux cotisations
- Paiement déclaré par membre + validation gestionnaire
- Paiement direct gestionnaire
- Résumés tableau de bord (membre/gestionnaire)
- Notifications d’actions en attente
- Interface mobile + desktop
- Deux thèmes côté profil :
  - `Classique`
  - `Responsable`
  (le choix est mémorisé par utilisateur dans le navigateur)

## Structure du dépôt

```text
cotisations-app/
├── backend/      API NestJS + Prisma + PostgreSQL
├── frontend/     Application React + Vite + Tailwind
└── ops/          Fichiers de déploiement VM (Nginx + systemd)
```

## Démarrage local

## 1) Backend

```bash
cd backend
npm install
cp .env.example .env
```

Configurer `backend/.env` puis :

```bash
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

API disponible sur `http://localhost:3000/api`.

## 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Configurer `frontend/.env` :

```env
VITE_API_URL=http://localhost:3000/api
```

Puis :

```bash
npm run dev
```

Application disponible sur `http://localhost:5173`.

## Données de test

Depuis `backend/` :

```bash
npm run prisma:seed
```

Le seed standard crée un compte test public :

- `demo@koty.local`
- mot de passe : `KotyDemo123!`

Charge simple :

```bash
npm run prisma:seed:stress
```

## Vérifications avant mise en ligne

```bash
# backend
npm --prefix backend run build
npm --prefix backend run test -- --runInBand
npm --prefix backend run test:e2e -- --runInBand

# frontend
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Déploiement (VM Linux, sans Docker)

Le dossier `ops/` contient :

- un service systemd pour l’API
- une conf Nginx pour servir le frontend
- un script de déploiement simple

Je détaille chaque partie dans :

- `backend/README.md`
- `frontend/README.md`
- `ops/README.md`
