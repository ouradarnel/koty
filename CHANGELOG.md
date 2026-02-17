# 📝 Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-02-16

### 🎉 Première Release - MVP Backend Complet

### ✅ Ajouté

#### Backend
- Configuration complète NestJS + TypeScript
- Intégration PostgreSQL avec Prisma ORM
- Schéma de base de données complet avec 8 modèles
- Authentification JWT avec refresh tokens
- Module Users (création, recherche)
- Module Groups (CRUD, gestion des membres, système de rôles)
- Module Contributions (CRUD, périodes automatiques, calcul de soldes)
- Module Payments (déclaration, validation, paiement direct)
- Module Dashboard (vue membre et gestionnaire)
- Guards de sécurité (JWT, vérification des rôles)
- Validation des données avec class-validator
- Gestion des erreurs centralisée
- API REST complète avec 25+ endpoints

#### Frontend
- Configuration Vite + React 18 + TypeScript
- Configuration Tailwind CSS avec thème personnalisé
- Client API Axios avec intercepteurs JWT
- Routing avec React Router DOM v6
- TanStack Query pour la gestion d'état serveur
- Page Login avec validation
- Page Register avec validation
- Page Dashboard (base)
- Types TypeScript complets (12 interfaces)
- Service d'authentification complet
- Refresh automatique des tokens

#### Documentation
- README principal avec vue d'ensemble
- README Backend détaillé avec documentation API
- README Frontend avec structure et guide
- ROADMAP complet sur 5 phases
- SETUP guide d'installation pas à pas
- CHANGELOG (ce fichier)

### 🔒 Sécurité
- Mots de passe hashés avec bcrypt (12 rounds)
- JWT avec access token (15min) et refresh token (7 jours)
- Protection des routes avec guards NestJS
- Validation des données entrantes
- CORS configuré
- Protection contre les injections SQL (Prisma)

### 📊 Base de Données
- **8 Tables créées :**
  - users (utilisateurs)
  - groups (groupes)
  - group_members (associations utilisateur-groupe)
  - contributions (cotisations)
  - contribution_members (associations membre-cotisation)
  - periods (périodes de cotisation)
  - payments (paiements)

- **Relations établies :**
  - One-to-Many : User → GroupMember, User → Payment
  - One-to-Many : Group → GroupMember, Group → Contribution
  - One-to-Many : Contribution → Period, Contribution → Payment
  - Many-to-One : Payment → User, Payment → Contribution

### 🎯 Fonctionnalités Métier
- Gestion multi-groupes (un utilisateur dans plusieurs groupes)
- Système de rôles (MEMBER / MANAGER)
- Multi-cotisations par groupe
- Support multi-devises (EUR, XOF, USD, etc.)
- Génération automatique des périodes mensuelles
- Double workflow de paiement (déclaration + direct)
- Calcul automatique des soldes (avances/retards)
- Gestion des avances (paiement couvrant plusieurs mois)
- Modification sécurisée des cotisations (appliquée au futur uniquement)
- Validation de paiements par les gestionnaires

### 📦 Packages Principaux

**Backend :**
- @nestjs/common: ^10.3.0
- @nestjs/jwt: ^10.2.0
- @prisma/client: ^5.8.0
- bcrypt: ^5.1.1
- class-validator: ^0.14.0

**Frontend :**
- react: ^18.2.0
- react-router-dom: ^6.21.3
- @tanstack/react-query: ^5.17.19
- axios: ^1.6.5
- tailwindcss: ^3.4.1

---

## [Unreleased] - Prévu pour v1.1.0

### 🚧 En Cours (Phase 2)

#### Interface Utilisateur
- [ ] Composants UI réutilisables (Button, Card, Modal, etc.)
- [ ] Page Groups complète avec création
- [ ] Page GroupDetail avec vue membre/gestionnaire
- [ ] Page ContributionDetail avec gestion paiements
- [ ] Dashboard personnalisé avec statistiques

#### Fonctionnalités
- [ ] Upload de preuves de paiement
- [ ] Filtres et recherche dans les listes
- [ ] Pagination des résultats
- [ ] Notifications toast
- [ ] Gestion des erreurs améliorée

---

## [Future] - Prévu pour v2.0.0

### 🔮 Fonctionnalités Avancées

#### Notifications
- [ ] Système de notifications en temps réel
- [ ] Notifications par email
- [ ] Notifications push (PWA)

#### Paiements
- [ ] Paiements partiels
- [ ] Paiements récurrents
- [ ] Historique complet avec filtres

#### Exports
- [ ] Export PDF des relevés
- [ ] Export Excel des paiements
- [ ] Rapports mensuels/annuels

#### Devises
- [ ] Support multi-devises avancé
- [ ] Conversion automatique
- [ ] Taux de change configurables

#### Fréquences
- [ ] Cotisations hebdomadaires
- [ ] Cotisations trimestrielles
- [ ] Cotisations annuelles

---

## [Future] - Prévu pour v3.0.0 (SaaS)

### 💎 Mode Premium

#### SaaS
- [ ] Plans d'abonnement (Free, Pro, Enterprise)
- [ ] Intégration Stripe
- [ ] Dashboard admin
- [ ] Gestion des licences

#### Mobile
- [ ] Application React Native
- [ ] Synchronisation offline
- [ ] Notifications push natives

#### Intégrations
- [ ] API publique documentée
- [ ] Webhooks
- [ ] Intégration bancaire

#### IA
- [ ] Prédiction des retards
- [ ] Suggestions intelligentes
- [ ] Détection d'anomalies

---

## Notes de Version

### Version 1.0.0 - Statut
- ✅ Backend : **Production Ready**
- ⚠️ Frontend : **Base fonctionnelle** (nécessite Phase 2)
- 📊 Base de données : **Schema stable**
- 🔒 Sécurité : **Implémentée**

### Prochains Jalons
1. **v1.1.0** (Mars 2026) - Interface utilisateur complète
2. **v1.5.0** (Avril 2026) - Notifications et exports
3. **v2.0.0** (Juin 2026) - Features avancées
4. **v3.0.0** (2027) - Mode SaaS

---

**Légende :**
- ✅ Terminé
- 🚧 En cours
- 📋 Planifié
- 💡 Idée future
- 🐛 Bug corrigé
- ⚠️ Alerte/Avertissement
- 🔒 Sécurité
- 📚 Documentation
