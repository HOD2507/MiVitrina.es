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

## Schéma relationnel (finalisé — `packages/database/prisma/schema.prisma`)

```
User (id, email, role[ADMIN|ANNONCEUR|COMMERCANT], locale, suspended, ...)
├── CommercantProfile (1-1, pays, businessIdType[SIRET|NIF_CIF], businessIdNumber,
│                       verificationStatus, adresse, lat/lng, openingHours (JSON),
│                       allInOneServiceEnabled, stripeAccountId)
│   ├── ShowcasePhoto[] (photos générales de la vitrine)
│   └── VitrineSpace[] (un espace = une taille précise sur la vitrine)
│       ├── SpacePhoto[]
│       ├── PricingOption[] (durationType[SEMAINE|MOIS|LIBRE], price)
│       └── Reservation[] (disponibilité déduite des réservations actives,
│                           pas de calendrier séparé)
└── AnnonceurProfile (1-1, raison sociale optionnelle, adresse facturation)

Reservation (annonceurProfileId, spaceId, pricingOptionId, startDate, endDate,
             status[PENDING_VALIDATION|CONFIRMED|ACTIVE|COMPLETED|
                    CANCELLED_BY_*|NO_SHOW|DISPUTE],
             posterFileUrl, moderationStatus[PENDING|APPROVED|REJECTED],
             installPhotoUrl/removalPhotoUrl (double confirmation photo),
             autoRenew, allInOneServiceRequested)
├── Transaction (1-1 ; amount, commissionRate FIGÉ au moment du paiement,
│                 commissionAmount, commercantPayoutAmount, refundedAmount,
│                 stripePaymentIntentId, stripeTransferId)
│   └── Invoice[] (recipientType[COMMERCANT|PLATEFORME], invoiceNumber, pdfUrl)
├── Review[] (auteur, cible, note, commentaire — unique par (reservation, auteur))
├── Dispute[] (raisedBy, status[OPEN|RESOLVED|REJECTED], resolution, refundAmount)
└── ChatThread (1-1 optionnel ; peut aussi exister sans réservation)
    └── ChatMessage[] (flagged/flagReason pour anti-contournement)

Notification (userId, type, title, body, payload JSON, readAt)

PlatformSettings — ligne unique (id="global"), éditée uniquement par l'admin :
  - commissionRate (Decimal 0.1500 = 15% par défaut) — chaque Transaction
    fige ce taux au moment du paiement, donc un changement ultérieur par
    l'admin n'affecte jamais les transactions déjà passées.
  - freeCancellationHours (48h par défaut)
```

**Validé** : migration Postgres réelle appliquée (17 tables), smoke-test bout-en-bout
(création user → profil commerçant FR/SIRET → espace → tarif → profil annonceur ES →
réservation → transaction avec calcul de commission depuis `PlatformSettings`).

## Étapes de développement

1. ✅ Scaffolding monorepo
2. ✅ Schéma de base de données complet + migration initiale
3. ✅ Authentification (3 rôles) + pages login/inscription
4. ✅ Stockage S3/MinIO (upload présigné) + justificatif d'identité commerçant
5. Pages commerçant (vitrine, tarifs, disponibilités)
6. Recherche géolocalisée annonceur + fiche commerce
7. Réservation + upload affiche + modération basique
8. Paiement Stripe Connect (split commission)
9. Chat + confirmations photo pose/retrait
10. Dashboard admin
11. Avis, renouvellement automatique, notifications avancées (post-MVP)

### Stockage fichiers (étape 4)

- Upload direct navigateur -> S3/MinIO via POST présigné (`@aws-sdk/s3-presigned-post`) :
  le fichier ne transite jamais par l'API. Taille max et type MIME imposés
  par des conditions de policy S3, pas seulement côté client.
- **Bucket privé par défaut** (indispensable pour les justificatifs
  d'identité) : la lecture passe par une URL signée à durée limitée
  (`StorageService.getPresignedReadUrl`), jamais par une URL stockée en
  clair. Les photos réellement publiques (vitrine, espaces) auront leur
  propre politique d'accès à l'étape "Ma vitrine".
- MinIO en dev via `quay.io/minio/minio` (pas `docker.io/minio/minio`,
  dont la distribution anonyme a été retirée début 2025 lors du virage
  commercial "AIStor" de MinIO).
