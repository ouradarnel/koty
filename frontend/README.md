# Frontend Koty

Interface web React pour piloter les groupes, les cotisations et les paiements.

## Prérequis

- Node.js 20+
- npm
- backend Koty en fonctionnement

## Installation

```bash
npm install
cp .env.example .env
```

`.env` minimal :

```env
VITE_API_URL=http://localhost:3000/api
```

Optionnel (compte test public affiché sur la page connexion) :

```env
VITE_DEMO_EMAIL=demo@koty.local
VITE_DEMO_PASSWORD=KotyDemo123!
```

## Lancement

```bash
npm run dev
```

Frontend disponible sur `http://localhost:5173`.

## Compilation

```bash
npm run lint
npm run build
npm run preview
```

## Pages principales

- `/login` : connexion + demande de réinitialisation
- `/register` : inscription
- `/dashboard` : vue globale personnelle
- `/groups` : liste des groupes
- `/groups/new` : création de groupe
- `/groups/:groupId` : détail groupe (membre/gestionnaire)
- `/contributions/:contributionId` : détail cotisation + paiements
- `/profile` : profil + administration (si compte admin)
- `/guide` : guide d’utilisation

## Thèmes

Le changement de thème est géré dans la page profil.

- `Classique`
- `Responsable`

Le choix est enregistré dans `localStorage` (`app-theme`) et reste actif tant qu’il n’est pas modifié.

## Remarques interface

- Toutes les pages sont prévues pour mobile et desktop.
- La navigation mobile contient les actions principales.
- Les notifications indiquent les actions en attente (invitations, validations, mises à jour).
