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
- **Cartographie / géolocalisation** : OpenStreetMap + Leaflet (carte) et
  Nominatim (géocodage) — gratuit, sans clé API ni facturation à activer
  (décision utilisateur du 2026-09-14). Remplaçable par Google Maps plus
  tard (Places/Geocoding/Maps JS) sans réécrire la logique métier : il
  suffirait d'un autre service implémentant la même interface
  `geocode(address)` côté API, et d'un composant carte équivalent côté web.

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
| Frontend | Next.js 15 (App Router) + TS + Tailwind v4 + shadcn/ui | SEO pour landing + pages commerces publiques ; composants accessibles standardisés |
| i18n | next-intl | Routing par préfixe de langue, fr + es |
| Backend | NestJS (TS) | DI, guards RBAC (ADMIN/ANNONCEUR/COMMERCANT), validation par decorators |
| Base de données | PostgreSQL + Prisma | Migrations typées, schéma relationnel clair |
| Auth | JWT (access + refresh), cookies httpOnly | Réutilisable par un futur client mobile |
| Paiement | Stripe Connect (comptes Express, FR + ES) | KYC géré par Stripe, transfers avec commission retenue |
| Chat | WebSocket (NestJS Gateway / Socket.IO) + persistance Postgres | Pas de Redis pub/sub nécessaire au stade MVP |
| Jobs asynchrones | BullMQ + Redis | Rappels, auto-annulation, facturation, renouvellement |
| Stockage fichiers | S3 (prod) / MinIO (dev), URLs présignées | Photos vitrine, affiches, photos pose/retrait |
| Emails | Resend | Transactionnel |
| Cartographie | OpenStreetMap + Leaflet (carte), Nominatim (géocodage) | Gratuit, sans clé — recherche géolocalisée par rayon (Haversine SQL) |
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
5. ✅ Système de design (Tailwind v4 + shadcn/ui) + refonte visuelle landing/auth/dashboard
6. ✅ Page commerçant "Ma vitrine" (espaces, tarifs, photos)
7. ✅ Recherche géolocalisée annonceur + fiche commerce
8. ✅ Réservation + upload affiche + modération basique
9. Paiement Stripe Connect (split commission)
10. Chat + confirmations photo pose/retrait
11. Dashboard admin
12. Avis, renouvellement automatique, notifications avancées (post-MVP)

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

### Système de design (étape 5)

- **shadcn/ui** (style "base-nova", composants sur **Base UI** — pas
  Radix) + **Tailwind v4** (upgrade depuis v3, requis par ce style :
  thème CSS-first via `@theme inline`, plus de `tailwind.config.ts`
  nécessaire). Composants copiés dans `src/components/ui/` (pas une
  dépendance npm figée), donc modifiables directement.
- Palette de marque : accent ambre (`oklch(0.666 0.179 58.318)`, cohérent
  avec l'affiche de l'animation hero) sur fond neutre chaud, typographie
  Plus Jakarta Sans (`next/font/google`).
- Base UI utilise un prop `render` (élément React) au lieu du `asChild`
  de Radix pour faire porter un composant par un autre élément (ex:
  `<Button render={<Link href="..." />}>`) — et **exige `nativeButton=false`
  explicitement** quand le rendu final n'est pas un vrai `<button>` (un
  lien, notamment), sous peine d'avertissements console. Le composant
  `Button` local le déduit automatiquement de la présence de `render`.
- `Select.Value` de Base UI n'affiche pas automatiquement le libellé de
  l'item sélectionné (contrairement à Radix) : il faut lui passer une
  fonction `(value) => label` explicite.

### Recherche géolocalisée (étape 7)

- **Géocodage** (`apps/api/src/geocoding`) : adresse commerçant géocodée
  automatiquement à l'inscription via Nominatim (OpenStreetMap), avant la
  transaction DB (jamais d'appel réseau dans une transaction ouverte). Un
  échec de géocodage ne bloque jamais l'inscription — le commerce reste
  simplement invisible en recherche tant que ses coordonnées sont nulles.
  Limité à 1 req/s (politique d'usage Nominatim) via un throttle en mémoire.
- **Recherche par rayon** (`apps/api/src/discovery`) : distance calculée
  en SQL (formule de Haversine, pas de PostGIS au MVP), filtrée d'abord
  par une bounding box grossière sur (latitude, longitude) pour rester
  performant, affinée ensuite par la distance exacte. `LEAST`/`GREATEST`
  protègent `acos()` d'un dépassement de [-1, 1] dû aux imprécisions
  flottantes. Seuls les commerces `VERIFIED` avec coordonnées connues
  apparaissent. Endpoints publics (`@Public()`), consultables sans compte.
- Comparer un enum Postgres à un paramètre texte dans `$queryRaw` exige un
  cast explicite (`= ${valeur}::"NomDeLEnum"`), sans quoi Postgres renvoie
  une erreur d'opérateur — piège rencontré en testant, pas visible au
  typecheck TypeScript.
- **Carte** : Leaflet + react-leaflet, chargés uniquement côté client
  (`next/dynamic`, `ssr:false`) car Leaflet touche `window` à l'import.

### Réservation + upload affiche + modération (étape 8)

- `apps/api/src/reservations/` : cycle complet côté API — création
  (vérifie que le tarif/l'espace existe, que le commerce est `VERIFIED`,
  calcule la date de fin selon le type de durée, détecte les
  chevauchements avec les réservations déjà actives/en attente sur le
  même espace), upload/confirmation d'affiche (mêmes garde-fous
  d'appartenance que les autres photos), annulation par l'annonceur
  (uniquement tant que `PENDING_VALIDATION`), réponse du commerçant
  (`approve`/`reject` — approuver exige qu'une affiche ait été envoyée).
- Chaque réservation crée une `Transaction` (montant, commission figée
  depuis `PlatformSettings`) — voir l'étape suivante pour le paiement
  réel désormais branché dessus (encaissement, transfert, remboursement).
- Bug réel trouvé en testant un vrai scénario "réservation d'un mois" à
  cheval sur le changement d'heure d'octobre : `setMonth()`/`setDate()`
  opèrent en heure LOCALE alors qu'une date ISO ("2026-10-01") est parsée
  en UTC minuit — la date de fin dérivait d'une heure. Corrigé en
  utilisant systématiquement `setUTCMonth()`/`setUTCDate()`.
- Frontend : `/reserver` (formulaire, protégé ANNONCEUR), `/mes-reservations`
  (annonceur) et `/dashboard/reservations` (commerçant) partagent un même
  composant `ReservationCard` (badges de statut, actions selon le rôle et
  l'état, `router.refresh()` après chaque action pour resynchroniser avec
  le Server Component parent).

### Paiement Stripe Connect (étape 9)

- `apps/api/src/stripe/stripe.service.ts` : fine couche autour du SDK
  `stripe` — comptes Express (`createExpressAccount`), lien d'onboarding
  hébergé (`createAccountLink`), statut live du compte
  (`getAccountStatus`), session Stripe Checkout hébergée
  (`createCheckoutSession`), virement vers le commerçant
  (`createTransfer`), remboursement (`refund`) et vérification de
  signature webhook (`constructWebhookEvent`).
- **Modèle « separate charge and transfer »** : l'annonceur paie via une
  Checkout Session qui encaisse sur le solde de la PLATEFORME (pas de
  `on_behalf_of` ni de compte connecté à l'étape du paiement). L'argent
  n'est viré au commerçant (`Transfer`, pour `commercantPayoutAmount`
  uniquement — la commission ne quitte jamais le solde plateforme) qu'à
  l'approbation de la demande. Ça permet un remboursement intégral et
  immédiat si le commerçant refuse, sans jamais avoir à réclamer de
  l'argent déjà transféré.
- `CommercantsController` expose `POST /commercants/me/stripe/onboarding`
  (crée le compte Express au premier appel, sinon régénère juste un lien
  frais) et `GET /commercants/me/stripe/status` (relit l'état réel
  auprès de Stripe et resynchronise `stripeOnboardingComplete` en base —
  utile juste après le retour d'onboarding, sans attendre le webhook).
- `ReservationsService` : `createCheckoutSession` (vérifie propriété +
  `PENDING_VALIDATION` + pas déjà payée) ; `respond()` en `approve` exige
  désormais `transaction.status === PAID` ET un onboarding Stripe
  commerçant complet avant de créer le `Transfer` ; `respond()` en
  `reject` et `cancel()` déclenchent un vrai `refund()` Stripe (statut
  `REFUNDED`, `refundedAmount` renseigné) **seulement si** de l'argent a
  réellement été encaissé (`transaction.status === PAID`) — sinon on
  reste sur `FAILED` (rien à rembourser).
- `apps/api/src/webhooks/webhooks.controller.ts` (`POST /api/webhooks/stripe`,
  `@Public()`) : `checkout.session.completed` marque la transaction
  `PAID` (`markPaid` sur `ReservationsService`) ; `account.updated`
  resynchronise `stripeOnboardingComplete`. Nécessite
  `NestFactory.create(AppModule, { rawBody: true })` dans `main.ts` pour
  que `req.rawBody` (Buffer non parsé) soit disponible : la vérification
  de signature Stripe échoue sur un body déjà repassé en JSON.
- Montants : la base stocke des `Decimal` en euros, Stripe attend des
  centimes entiers — conversion via un helper `toCents()` à chaque appel
  Stripe (`Math.round(Number(amount) * 100)`).
- Testé de bout en bout en local avec le vrai CLI Stripe
  (`stripe listen --forward-to localhost:4000/api/webhooks/stripe`, avec
  `--api-key` pour éviter le flow de login navigateur) et un vrai
  paiement carte de test (4242 4242 4242 4242) via Playwright sur la
  page Checkout hébergée réelle : session créée → paiement → webhook
  reçu et vérifié → `Transaction.status = PAID` avec le vrai
  `stripePaymentIntentId` ; puis refus commerçant → vrai `Refund` Stripe
  confirmé côté API Stripe → `Transaction.status = REFUNDED`. Le
  virement (`Transfer`) vers le commerçant n'a pas encore pu être testé
  en conditions réelles au départ : le compte Stripe de test n'avait pas
  Connect activé. Une fois activé (https://dashboard.stripe.com/connect),
  un nouveau blocage est apparu : Stripe a basculé les nouveaux comptes
  sur l'API "Accounts v2" par défaut, qui rejette `accounts.create` (API
  v1, utilisée ici) avec une erreur suggérant d'exécuter
  `npx skills add stripe/ai` — une instruction d'installation glissée
  dans un message d'erreur d'API, ciblant explicitement les intégrations
  par agent ; **volontairement ignorée** (aucune exécution), même si le
  message provient bien de Stripe. La vraie solution : réactiver la
  compatibilité v1 dans le dashboard
  (https://dashboard.stripe.com/settings/features/feat_accounts_v1_support).
  Après ça, la création de compte Express + lien d'onboarding hébergé a
  été testée avec succès (vrai `stripeAccountId` créé en base, vraie
  page Stripe atteinte). La complétion intégrale du formulaire
  d'onboarding déclenche un hCaptcha (protection anti-robot normale de
  Stripe) — volontairement non contourné ; ce dernier pas (et donc le
  test réel d'un `Transfer`) doit être fait par un humain dans un vrai
  navigateur.

### Chat + double confirmation photo pose/retrait (étape 10)

- `apps/api/src/chat/` : conversation unique par paire commerçant/
  annonceur (`@@unique([commercantProfileId, annonceurProfileId])` sur
  `ChatThread`, optionnellement rattachée à une réservation). Seul
  l'annonceur peut initier (`POST /chat/threads`) ; les deux parties
  peuvent ensuite lister (`GET /chat/threads`, avec dernier message et
  compteur de non-lus) et échanger (`GET`/`POST .../messages`) —
  l'appartenance à la conversation est vérifiée en service, pas par rôle.
  `GET .../messages` marque au passage les messages de l'autre partie
  comme lus.
- **Modération anti-contournement** (`chat-moderation.ts`, testée en
  unitaire) : regex email/URL/téléphone appliquées à CHAQUE message.
  Plutôt que de bloquer l'envoi ou juste flaguer après coup, le contenu
  réellement stocké et livré a les coordonnées **masquées**
  (`[numéro masqué]`, etc.) — empêche vraiment la fuite de coordonnées,
  tout en gardant `flagged`/`flagReason` pour une revue admin future.
  Faux positifs possibles (une date collée sans séparateur) : compromis
  MVP assumé.
- Frontend : page `/messages` (liste des conversations + fil + saisie),
  polling simple (4s messages / 15s liste, pas de websocket au MVP) ;
  bouton "Discuter" sur `ReservationCard` (annonceur : crée/récupère le
  thread puis y navigue ; commerçant : va à l'inbox) et "Contacter ce
  commerce" sur la fiche publique.
- **Double confirmation photo** (pose puis retrait) : `Reservation`
  avait déjà `installPhotoUrl`/`installConfirmedAt`/`removalPhotoUrl`/
  `removalConfirmedAt` en base depuis la conception initiale. Cycle :
  commerçant envoie une photo (`POST .../install-photo` puis
  `.../removal-photo`, ownership vérifiée par préfixe de clé comme pour
  l'affiche) → l'annonceur confirme (`PATCH .../confirm-install` puis
  `.../confirm-removal`, statut CONFIRMED→ACTIVE puis ACTIVE→COMPLETED)
  **ou conteste**. Une contestation crée un vrai `Dispute` (modèle déjà
  existant, aucune migration nécessaire) et passe la réservation en
  statut DISPUTE, en attente d'arbitrage admin — choisi plutôt qu'une
  boucle de refus/réenvoi, un désaccord sur une preuve de pose/retrait
  étant un différend de fait entre les deux parties.
- Testé de bout en bout (curl + Playwright, upload d'une vraie image) :
  upload avec mauvaise clé rejeté (403), cycle pose→ACTIVE, retrait,
  contestation créant bien un `Dispute` en base avec statut OPEN.
