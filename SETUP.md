# 🚀 Guide d'Installation Complet

Je documente ici, étape par étape, comment installer et lancer l'application complète.

---

## 📋 Prérequis Système

Avant de commencer, j'installe :

- **Node.js 20+** et npm
  ```bash
  node --version  # Devrait afficher v20.x.x ou supérieur
  npm --version
  ```

- **PostgreSQL 14+**
  ```bash
  psql --version  # Devrait afficher 14.x ou supérieur
  ```

- **Git**
  ```bash
  git --version
  ```

---

## 🗂️ Étape 1 : Cloner le Projet

```bash
# Cloner le repository (à adapter selon mon repo)
git clone <mon-repo-url> cotisations-app
cd cotisations-app
```

Structure attendue :
```
cotisations-app/
├── backend/
├── frontend/
├── README.md
├── ROADMAP.md
└── SETUP.md (ce fichier)
```

---

## 🐘 Étape 2 : Configurer PostgreSQL

### 2.1 Démarrer PostgreSQL

**Sur macOS (Homebrew) :**
```bash
brew services start postgresql@14
```

**Sur Linux (Ubuntu/Debian) :**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Sur Windows :**
Utiliser pgAdmin ou démarrer le service PostgreSQL

### 2.2 Créer la base de données

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Dans psql, créer la base de données
CREATE DATABASE cotisations_db;

# Créer un utilisateur (optionnel, mais recommandé)
CREATE USER cotisations_user WITH ENCRYPTED PASSWORD 'db_password';
GRANT ALL PRIVILEGES ON DATABASE cotisations_db TO cotisations_user;

# Quitter psql
\q
```

### 2.3 Vérifier la connexion

```bash
psql -U postgres -d cotisations_db -c "SELECT version();"
```

---

## 🔧 Étape 3 : Configurer le Backend

### 3.1 Aller dans le dossier backend

```bash
cd backend
```

### 3.2 Installer les dépendances

```bash
npm install
```

**Temps estimé :** 2-3 minutes

### 3.3 Configurer les variables d'environnement

```bash
# Copier le fichier exemple
cp .env.example .env

# Éditer le fichier .env
nano .env  # ou vim .env ou mon éditeur préféré
```

**Contenu du .env à configurer :**

```env
# Database
DATABASE_URL="postgresql://postgres:db_password@localhost:5432/cotisations_db?schema=public"

# JWT Secrets (IMPORTANT : Changez ces valeurs en production !)
JWT_SECRET="secret-jwt-fort-a-remplacer-123456"
JWT_REFRESH_SECRET="secret-refresh-fort-a-remplacer-789012"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:5173"

# Rate limiting (global)
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=120
```

**⚠️ IMPORTANT :** En production, générez des clés secrètes fortes :
```bash
# Générer une clé secrète
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3.4 Initialiser Prisma et la base de données

```bash
# Générer le client Prisma
npm run prisma:generate

# Exécuter les migrations (créer les tables)
npm run prisma:migrate

# (Optionnel) Ouvrir Prisma Studio pour visualiser la DB
npm run prisma:studio
```

**Vérification :** Je dois voir les tables créées dans ma base PostgreSQL.

### 3.5 Démarrer le backend

```bash
npm run start:dev
```

**Résultat attendu :**
```
API running on: http://localhost:3000/api
```

**Test rapide :**
```bash
curl http://localhost:3000/api/health
```

---

## ⚛️ Étape 4 : Configurer le Frontend

### 4.1 Ouvrir un nouveau terminal

Gardez le backend en cours d'exécution dans le premier terminal.

```bash
# Depuis la racine du projet
cd frontend
```

### 4.2 Installer les dépendances

```bash
npm install
```

**Temps estimé :** 2-3 minutes

### 4.3 Configurer les variables d'environnement

```bash
# Copier le fichier exemple
cp .env.example .env

# Le fichier .env devrait contenir :
echo "VITE_API_URL=http://localhost:3000/api" > .env
```

En production, `VITE_API_URL` est requis (pas de fallback vers localhost).

### 4.4 Démarrer le frontend

```bash
npm run dev
```

**Résultat attendu :**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## ✅ Étape 5 : Tester l'Application

### 5.1 Ouvrir l'application

J'ouvre mon navigateur et je vais sur : **http://localhost:5173**

### 5.2 Créer un compte

1. Cliquez sur "S'inscrire"
2. Remplissez le formulaire :
   - Nom : `Test User`
   - Email : `test@example.com`
   - Mot de passe : `password123`
3. Cliquez sur "S'inscrire"

Je dois être redirigé vers le dashboard.

### 5.3 Vérifier l'authentification

```bash
# Dans un terminal, vérifier l'utilisateur créé
cd backend
npm run prisma:studio
```

Dans Prisma Studio, je dois voir mon utilisateur dans la table `users`.

---

## 🧪 Étape 6 : Test du Workflow Complet (Manuel)

### Via l'interface (À venir - Phase 2)
L'interface complète sera disponible dans la Phase 2 de la roadmap.

### Via API (Test avec curl ou Postman)

#### 1. S'inscrire
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Réponse attendue :**
```json
{
  "user": {
    "id": "uuid...",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "name": "Test User"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

Copiez le `accessToken` pour les requêtes suivantes.

#### 2. Créer un groupe
```bash
TOKEN="votre_access_token_ici"

curl -X POST http://localhost:3000/api/groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Famille Dupont",
    "description": "Cotisation familiale mensuelle"
  }'
```

#### 3. Créer une cotisation
```bash
GROUP_ID="group_id_from_previous_response"

curl -X POST http://localhost:3000/api/contributions/groups/$GROUP_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Cotisation Mensuelle",
    "description": "Pour les dépenses communes",
    "amount": 50,
    "currency": "EUR",
    "frequency": "MONTHLY",
    "dueDay": 5
  }'
```

#### 4. Déclarer un paiement
```bash
CONTRIBUTION_ID="contribution_id_from_previous_response"

curl -X POST http://localhost:3000/api/payments/contributions/$CONTRIBUTION_ID/declare \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount": 50,
    "note": "Paiement du mois de février"
  }'
```

---

## 🔧 Dépannage

### Problème : "Port 3000 already in use"

**Solution :**
```bash
# Trouver le processus qui utilise le port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Tuer le processus
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Ou changer le port dans backend/.env
PORT=3001
```

### Problème : "Connection to database failed"

**Vérifications :**
1. PostgreSQL est-il en cours d'exécution ?
   ```bash
   psql -U postgres -c "SELECT 1"
   ```

2. La base de données existe-t-elle ?
   ```bash
   psql -U postgres -l | grep cotisations_db
   ```

3. Les credentials dans `.env` sont-ils corrects ?

### Problème : "Prisma Client is not generated"

**Solution :**
```bash
cd backend
npm run prisma:generate
```

### Problème : "Cannot find module '@/...' "

**Solution :**
```bash
cd frontend
npm install
# Redémarrer le serveur Vite
npm run dev
```

### Problème : "401 Unauthorized"

**Causes possibles :**
1. Token expiré → Se reconnecter
2. Token invalide → Vérifier le JWT_SECRET
3. Token manquant → Vérifier l'en-tête Authorization

---

## 📚 Commandes Utiles

### Backend
```bash
# Développement
npm run start:dev

# Build production
npm run build
npm run start:prod

# Prisma
npm run prisma:generate   # Générer le client
npm run prisma:migrate    # Créer une migration
npm run prisma:studio     # UI de la base de données

# Tests
npm run test
npm run test:e2e
```

### Frontend
```bash
# Développement
npm run dev

# Build production
npm run build
npm run preview

# Linting
npm run lint
```

---

## 🎉 Félicitations !

Mon environnement de développement est prêt.

### Prochaines étapes :

1. **Explorer l'application** via l'interface web
2. **Lire la ROADMAP** pour suivre les fonctionnalités à venir
3. **Consulter la documentation API** dans `/backend/README.md`
4. **Contribuer** en choisissant une tâche de la Phase 2

---

## 📞 Support

En cas de problème :
1. Vérifier la section Dépannage ci-dessus
2. Consulter les README des sous-projets
3. Ouvrir une issue sur GitHub

---

**Bon développement.**

---

## 🌍 Déploiement sur VM (Nginx + Node + systemd, sans Docker)

Objectif:
- Backend NestJS écoute sur `127.0.0.1:3000`
- Nginx sert `frontend/dist` et proxy `/api/` vers `127.0.0.1:3000`

### 1) Préparer l'OS

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

### 2) Backend (production)

```bash
cd ~/koty/backend
cp .env.example .env
```

Je configure `backend/.env`:
- `NODE_ENV="production"`
- `PORT=3000`
- `CORS_ORIGIN="http://<IP_PUBLIQUE_OU_DOMAINE>"`
- `JWT_SECRET` et `JWT_REFRESH_SECRET` forts
- `DATABASE_URL` (attention aux caractères spéciaux)

Note DB: si ton mot de passe Postgres contient `@`, il faut l'encoder en `%40` dans l'URL.
Exemple:
```env
DATABASE_URL="postgresql://koty_user:Juliette224%40@localhost:5432/koty_db?schema=public"
```

Build + migrations:
```bash
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run build
```

### 3) systemd (backend en service)

Template: `ops/systemd/koty-backend.service` (à adapter).

```bash
sudo cp ~/koty/ops/systemd/koty-backend.service /etc/systemd/system/koty-backend.service
sudo nano /etc/systemd/system/koty-backend.service
```

Je remplace:
- `User=<user>` par mon user linux
- les chemins `/home/<user>/...` si besoin
- `ExecStart=/usr/bin/node ...` si `which node` n'est pas `/usr/bin/node`

Activation:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now koty-backend
sudo systemctl status koty-backend --no-pager
```

Vérif:
```bash
curl -fsS http://127.0.0.1:3000/api/health
```

Logs:
```bash
sudo journalctl -u koty-backend -f
```

### 4) Frontend (build)

Le plus simple en prod: servir l'API sur le même domaine via Nginx, donc `VITE_API_URL=/api`.

```bash
cd ~/koty/frontend
npm ci
echo "VITE_API_URL=/api" > .env.production.local
npm run build
```

### 5) Nginx (frontend + reverse proxy)

Template: `ops/nginx/koty.conf` (à adapter).

```bash
sudo cp ~/koty/ops/nginx/koty.conf /etc/nginx/sites-available/koty
sudo nano /etc/nginx/sites-available/koty
sudo ln -sf /etc/nginx/sites-available/koty /etc/nginx/sites-enabled/koty
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

Vérifs:
```bash
curl -I http://127.0.0.1/
curl -fsS http://127.0.0.1/api/health
```

### 6) Pare-feu GCP

Il faut autoriser `tcp:80` (et `443` si HTTPS) côté **VPC Firewall**.

Dans Cloud Shell:
```bash
gcloud projects list
gcloud config set project <PROJECT_ID>

gcloud compute firewall-rules create koty-allow-http \
  --network=default --allow=tcp:80 --source-ranges=0.0.0.0/0
```

Ensuite j'ouvre dans le navigateur:
`http://<IP_PUBLIQUE>/`
