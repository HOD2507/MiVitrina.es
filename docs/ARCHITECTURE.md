# Architecture — MiVitrina.es

Plateforme de location d'espaces publicitaires en vitrine, connectant des
commerces physiques (annonceurs de l'espace) et des annonceurs publicitaires.

## Marchés MVP

- **Pays** : France (FR) et Espagne (ES)
- **Devise** : EUR uniquement (les deux marchés sont en zone euro)
- **Langues** : français (fr) et espagnol (es), routing i18n avec préfixe de langue
  (`/fr/...`, `/es/...`)
- **Vérification d'identité commerçant** : numéro d'identification d'entreprise
  générique + pays, avec validation dépendant du pays :
  - FR → SIRET (14 chiffres), vérifiable via l'API INSEE (SIRENE)
  - ES → NIF/CIF
- **Cartographie / géolocalisation** : Google Maps (Places API, Geocoding API,
  Maps JavaScript API)

## Monorepo

```
mivitrina/
├── apps/
│   ├── web/     # Next.js 15 (App Router, TS, i18n fr/es) — SSR pour SEO
│   └── api/     # NestJS (TS) — API REST + WebSocket (chat)
├── packages/
│   ├── database/ # Schéma Prisma (source de vérité SQL) + client généré
│   └── shared/    # Enums/types partagés (rôles, statuts, pays supportés...)
├── infra/
│   └── docker-compose.yml # Postgres, Redis, MinIO (dev local)
└── docs/
```

Outillage : pnpm workspaces + Turborepo.

## Stack technique

| Domaine | Choix | Justification |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TS + Tailwind | SEO pour landing + pages commerces publiques |
| i18n | next-intl | Routing par préfixe de langue, fr + es |
| Backend | NestJS (TS) | DI, guards RBAC (ADMIN/ANNONCEUR/COMMERCANT), validation par decorators |
| Base de données | PostgreSQL + Prisma | Migrations typées, schéma relationnel clair |
| Auth | JWT (access + refresh), cookies httpOnly | Réutilisable par un futur client mobile |
| Paiement | Stripe Connect (comptes Express, FR + ES) | KYC géré par Stripe, transfers avec commission retenue |
| Chat | WebSocket (NestJS Gateway / Socket.IO) + persistance Postgres | Pas de Redis pub/sub nécessaire au stade MVP |
| Jobs asynchrones | BullMQ + Redis | Rappels, auto-annulation, facturation, renouvellement |
| Stockage fichiers | S3 (prod) / MinIO (dev), URLs présignées | Photos vitrine, affiches, photos pose/retrait |
| Emails | Resend | Transactionnel |
| Cartographie | Google Maps (Places, Geocoding, Maps JS) | Recherche géolocalisée par rayon |
| Tests | Jest (unit API) + Playwright (e2e) | |
| CI | GitHub Actions | Lint, typecheck, test sur chaque PR |

## Rôles utilisateurs

- `ADMIN` : accès total, dashboard, modération, litiges
- `ANNONCEUR` : recherche, réservation, paiement, chat
- `COMMERCANT` : gestion vitrine/tarifs, validation réservations, revenus, chat

## Schéma relationnel (aperçu — sera détaillé à l'étape "base de données")

```
User (id, email, role, ...)
├── CommercantProfile (pays, numéroIdentificationFiscale, statutVérification, adresse, lat/lng, horaires)
│   └── VitrineSpace (nom, dimensions, photos[])
│       └── PricingOption (taille, durée, prix)
└── AnnonceurProfile (raison sociale, adresse facturation)

Reservation (annonceurId, spaceId, pricingOptionId, période, statut,
             posterUrl, moderationStatus, installPhotoUrl, removalPhotoUrl)
├── Transaction (montant, commission, statut paiement Stripe)
├── Invoice (destinataire: commerçant ou plateforme)
├── Review (note, commentaire)
└── Dispute (statut, résolution)

ChatThread → ChatMessage
Notification
PlatformSettings (taux de commission, délais d'annulation...)
```

## Étapes de développement

1. ✅ Scaffolding monorepo (ce commit)
2. Schéma de base de données complet + migrations
3. Authentification (3 rôles)
4. Pages commerçant (vitrine, tarifs, disponibilités)
5. Recherche géolocalisée annonceur + fiche commerce
6. Réservation + upload affiche + modération basique
7. Paiement Stripe Connect (split commission)
8. Chat + confirmations photo pose/retrait
9. Dashboard admin
10. Avis, renouvellement automatique, notifications avancées (post-MVP)
