# Ops (VM: Nginx + Node + systemd)

Ce dossier contient des fichiers "templates" pour déployer Koty sur une VM Linux sans Docker.

## Fichiers

- `ops/systemd/koty-backend.service` : service systemd pour lancer l'API NestJS.
- `ops/nginx/koty.conf` : vhost Nginx qui sert le frontend (Vite build) et proxy `/api/` vers le backend.
- `ops/deploy/deploy.sh` : script de déploiement simple (pull + build + migrate + restart).

## Remarque

Ces fichiers contiennent des placeholders (`/home/<user>/koty/...`) à adapter sur la VM.

