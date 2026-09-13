# MiVitrina.es

Plateforme de location d'espaces publicitaires en vitrine — met en relation
des commerces physiques (laveries, imprimeries, etc.) avec des annonceurs qui
souhaitent louer un espace vitrine pour y poser une affiche publicitaire.

Voir [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) pour l'architecture
complète, les choix techniques et la feuille de route.

## Structure du monorepo

- `apps/web` — Next.js (frontend, landing + dashboards, i18n fr/es)
- `apps/api` — NestJS (API backend)
- `packages/database` — schéma Prisma
- `packages/shared` — types/enums partagés
- `infra` — docker-compose pour l'environnement de dev local

## Démarrage local

```bash
# 1. Installer les dépendances
pnpm install

# 2. Copier les variables d'environnement
cp .env.example .env
cp .env.example apps/api/.env

# 3. Démarrer Postgres / Redis / MinIO
pnpm docker:up

# 4. Générer le client Prisma et appliquer les migrations
pnpm db:generate
pnpm db:migrate

# 5. Lancer le frontend et le backend
pnpm dev
```

- Frontend : http://localhost:3000
- API : http://localhost:4000/api
- Console MinIO : http://localhost:9001

## Prérequis

- Node.js 22+
- pnpm 10+
- Docker (pour Postgres/Redis/MinIO en local)
