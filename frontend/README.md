# ⚛️ Frontend - Plateforme de Gestion de Cotisations

Je maintiens cette application React + TypeScript pour gérer les cotisations collaboratives.

## 📋 Prérequis

- Node.js 20+ et npm
- Backend API en cours d'exécution (voir `/backend`)
- Backend connecté à PostgreSQL avec des credentials valides

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

Configurer l'URL de l'API dans `.env` :

```env
VITE_API_URL=http://localhost:3000/api
```

## 🏃 Démarrage

### Mode développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### Build production

```bash
npm run build
```

Les fichiers de production seront dans le dossier `dist/`

### Prévisualiser le build

```bash
npm run preview
```

## 📁 Structure du Projet

```
frontend/
├── public/              # Fichiers statiques
├── src/
│   ├── components/      # Composants réutilisables
│   ├── pages/           # Pages de l'application
│   ├── hooks/           # Custom React hooks
│   ├── services/        # Services API (Axios)
│   ├── types/           # Types TypeScript
│   ├── lib/             # Utilitaires
│   ├── App.tsx          # Composant principal
│   ├── main.tsx         # Point d'entrée
│   └── index.css        # Styles globaux
├── index.html
├── vite.config.ts       # Configuration Vite
├── tailwind.config.js   # Configuration Tailwind
└── package.json
```

## 🎨 Stack Technologique

- **React 18** - Bibliothèque UI
- **TypeScript** - Typage statique
- **Vite** - Build tool rapide
- **React Router DOM** - Routing
- **TanStack Query** - Gestion d'état serveur
- **Axios** - Client HTTP
- **Tailwind CSS** - Framework CSS
- **shadcn/ui** - Composants UI (à installer)

## 🔌 Services API

### AuthService (`services/auth.service.ts`)

```typescript
import { authService } from '@/services/auth.service';

// Inscription
await authService.register(email, password, firstName, lastName);

// Connexion
await authService.login(email, password);

// Déconnexion
await authService.logout();

// Obtenir l'utilisateur courant
await authService.getMe();
```

### API Client (`services/api.ts`)

Client Axios configuré avec :
- Intercepteurs pour ajouter automatiquement le token JWT
- Refresh automatique du token
- Redirection vers login si non authentifié

```typescript
import api from '@/services/api';

// Exemple d'utilisation
const response = await api.get('/groups');
```

## 🧩 Pages Principales

### 1. LoginPage (`/login`)
- Formulaire de connexion
- Validation des champs
- Gestion des erreurs
- Redirection après connexion
- Demande de réinitialisation de mot de passe (notification admin)

### 2. RegisterPage (`/register`)
- Formulaire d'inscription
- Champs prénom + nom
- Validation mot de passe
- Création de compte
- Connexion automatique

### 3. DashboardPage (`/dashboard`)
- Vue d'ensemble de l'utilisateur
- Liens rapides vers les groupes
- Statistiques personnelles

### 4. GroupsPage (`/groups`)
- Liste de tous les groupes liés au compte
- Vue simplifiée/détaillée
- Accès rapide aux détails de groupe

### 5. GroupDetailPage (`/groups/:id`)
- Résumé simplifié et vue détaillée
- Invitation de membre (gestionnaire)
- Création de cotisation (gestionnaire) avec date de première mensualité
- Suivi membres/cotisations
- Gestion des invitations de groupe et de cotisation en attente

### 6. ContributionDetailPage (`/contributions/:id`)
- Suivi des soldes et paiements
- Vue membre / vue gestionnaire
- Déclaration et validation de paiement

### 7. NewGroupPage (`/groups/new`)
- Création de groupe avec UX guidée
- Validation de base du formulaire

### 8. ProfilePage (`/profile`)
- Affichage du profil utilisateur
- Section administration visible pour compte admin
- Réinitialisation manuelle de mot de passe utilisateur (sans email provider)

## 🔔 Notifications et Invitations

- Les invitations de groupe et de cotisation sont chargées dans `AppShell`.
- Un badge de notification apparaît dans la navigation.
- L'utilisateur peut accepter/refuser directement depuis le popover d'invitations.

## 🔐 Authentification

L'authentification utilise JWT avec les fonctionnalités suivantes :

### Stockage des tokens
```typescript
localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', refreshToken);
localStorage.setItem('user', JSON.stringify(user));
```

### Routes protégées
Les routes sont protégées dans `App.tsx` :

```typescript
<Route
  path="/dashboard"
  element={
    isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />
  }
/>
```

### Refresh automatique
Le client API gère automatiquement le refresh du token quand il expire.

## 🎨 Styles et UI

### Tailwind CSS

Configuration personnalisée avec :
- Palette de couleurs
- Variables CSS pour le mode sombre
- Animations personnalisées

```css
/* Exemple d'utilisation */
<div className="bg-blue-600 text-white rounded-lg p-4">
  Contenu
</div>
```

### shadcn/ui (optionnel)

Pour ajouter des composants UI :

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
```

## 🧪 Custom Hooks (à créer)

### useAuth
```typescript
const { user, isAuthenticated, login, logout } = useAuth();
```

### useGroups
```typescript
const { groups, isLoading, createGroup } = useGroups();
```

### useContributions
```typescript
const { contributions, declarePayment } = useContributions(groupId);
```

## 📊 Gestion d'État

### TanStack Query

Configuration dans `main.tsx` :

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

Exemple d'utilisation :

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['groups'],
  queryFn: () => api.get('/groups').then(res => res.data),
});
```

## 🔧 Configuration Vite

Le proxy est configuré pour rediriger les requêtes `/api` vers le backend :

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

## 🐛 Débogage

### React DevTools
Installer l'extension React DevTools pour Chrome/Firefox

### Network Inspector
Vérifier les requêtes API dans l'onglet Network des DevTools

### Console Logs
Activer les logs de React Query :

```typescript
const queryClient = new QueryClient({
  logger: {
    log: console.log,
    warn: console.warn,
    error: console.error,
  },
});
```

## ✅ Statut du Frontend

### ✅ Implémenté

- [x] Configuration Vite + React + TypeScript
- [x] Routing (React Router)
- [x] Authentification (Login/Register)
- [x] Client API avec intercepteurs
- [x] Types TypeScript
- [x] Tailwind CSS configuré
- [x] Pages Dashboard / Groupes / Détail groupe / Détail cotisation / Profil
- [x] Création de groupe
- [x] Vues simplifiées/détaillées (pages principales)
- [x] Navigation responsive (desktop/mobile)

### 🚧 À Implémenter

- [ ] Composants UI réutilisables
- [ ] Custom hooks (useAuth, useGroups, etc.)
- [ ] Gestion des erreurs globale
- [ ] Notifications toast
- [ ] Mode sombre
- [ ] Tests unitaires

## 📦 Scripts NPM

```bash
npm run dev          # Démarrer en mode développement
npm run build        # Build pour la production
npm run preview      # Prévisualiser le build
npm run lint         # Linter le code
```

## 🌐 Variables d'Environnement

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| `VITE_API_URL` | URL de l'API backend | `http://localhost:3000/api` |

---

**Version:** 1.0.0  
**Dernière mise à jour:** Février 2026
