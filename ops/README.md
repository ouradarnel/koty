# Ops (VM Linux : Nginx + Node + systemd)

Ce dossier contient les fichiers pour déployer Koty sur une VM, sans Docker.

## Fichiers

- `ops/systemd/koty-backend.service`  
  Service systemd pour démarrer l’API NestJS.

- `ops/nginx/koty.conf`  
  Configuration Nginx : frontend statique + proxy `/api` vers le backend.

- `ops/deploy/deploy.sh`  
  Script de déploiement simple (mise à jour du code, build, migrations, redémarrage).

## Avant utilisation

- Adapter les chemins (`/home/<utilisateur>/koty/...`)
- Vérifier les variables d’environnement backend
- Vérifier les règles pare-feu (ports 80/443/22)

## Contrôles rapides après déploiement

```bash
curl -I http://127.0.0.1/
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS https://votre-domaine/api/health
```
