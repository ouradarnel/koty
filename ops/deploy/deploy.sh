#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$HOME/koty}"

echo "[deploy] pull"
cd "$ROOT_DIR"
git pull

echo "[deploy] backend deps/build/migrate"
cd "$ROOT_DIR/backend"
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run build

echo "[deploy] restart backend"
sudo systemctl restart koty-backend

echo "[deploy] frontend deps/build"
cd "$ROOT_DIR/frontend"
npm ci

# En prod, l'API est servie par Nginx sur le meme domaine => /api
echo "VITE_API_URL=/api" > .env.production.local

npm run build

echo "[deploy] reload nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "[deploy] healthcheck"
curl -fsS http://127.0.0.1/api/health >/dev/null
echo "[deploy] ok"

