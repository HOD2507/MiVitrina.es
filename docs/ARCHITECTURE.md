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
- **Un commerce sans onboarding Stripe terminé ne peut pas recevoir de réservations**
  (règle unique : `canReceiveBookings`, `commercants/booking-availability.ts`,
  basée sur `stripeOnboardingComplete` en base — pas d'appel Stripe à chaque
  recherche ; le champ est tenu à jour par le webhook `account.updated` et par
  `GET /commercants/me/stripe/status`). Effets : `GET /discovery/search` ne
  liste pas ces commerces ; `GET /discovery/commercants/:id` reste consultable
  mais renvoie `bookable: false` (le web affiche un avis et retire les boutons
  "Réserver") ; `ReservationsService.create` refuse avec le code
  `MERCHANT_NOT_BOOKABLE` (le web le traduit). Les réservations déjà payées
  avant que la règle existe ne sont pas touchées : `respond` → `approve` reste
  bloqué tant que l'onboarding n'est pas fini, et annuler/refuser rembourse.
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

### Tableau de bord admin (étape 11)

- `apps/api/src/admin/` (`@Roles(UserRole.ADMIN)` sur tout le contrôleur) :
  - `GET /admin/stats` : compteurs (commerçants, annonceurs, vérifications
    en attente, litiges ouverts, réservations en cours) + somme des
    commissions perçues (`Transaction.commissionAmount` sur PAID/
    PARTIALLY_REFUNDED).
  - `GET/PATCH /admin/commercants/pending-verification|:id/verification` :
    seul moyen de faire passer un commerçant en VERIFIED (jusqu'ici fait
    à la main via `psql` pendant les tests) — vérification manuelle
    confirmée par l'utilisateur en amont du projet, cf. décision produit
    "on peut faire ça d'abord manuellement". Renvoie une URL de lecture
    signée vers le justificatif (bucket privé).
  - `GET/PATCH /admin/settings` : taux de commission + délai d'annulation
    gratuite — confirme la décision produit "c'est l'admin qui gère la
    commission" (déjà implémentée dès la conception de `PlatformSettings`,
    ici enfin exposée à un vrai admin plutôt que la valeur par défaut).
  - `GET/PATCH /admin/disputes|:id/resolve` : arbitrage des litiges ouverts
    par `confirmInstall`/`confirmRemoval`. La résolution prend une
    décision (`RESOLVED`/`REJECTED`), une explication, un remboursement
    optionnel (déclenche un vrai `Refund` Stripe **partiel ou total**,
    `StripeService.refund` accepte maintenant un montant en centimes) et
    un statut de réservation cible. **Limite connue assumée** : si le
    commerçant avait déjà reçu son virement à l'approbation (modèle
    "separate charge and transfer"), rembourser l'annonceur après coup
    ne récupère pas automatiquement cet argent sur le compte connecté —
    ça reste un ajustement manuel entre plateforme et commerçant, comme
    dans beaucoup d'intégrations Stripe Connect réelles.
- Frontend : `/admin` (layout protégé + onglets), vue d'ensemble (cartes
  de stats), vérifications (liste + approuver/refuser avec motif),
  litiges (liste + dialogue de résolution : décision, explication,
  montant à rembourser si payé, suite de la réservation), réglages
  (formulaire commission en % + délai d'annulation). `/dashboard` redirige
  un ADMIN vers `/admin` (le dashboard générique ne lui sert à rien).
- Testé de bout en bout (curl + Playwright) : accès bloqué à un
  non-admin (403), approbation faisant baisser le compteur de
  vérifications en attente, remboursement partiel réel via un vrai
  paiement Stripe test (checkout complet par Playwright) confirmé côté
  API Stripe, résolution de litige mettant à jour transaction +
  réservation + dispute en une seule transaction logique.

### Refonte design (retour utilisateur direct, étape 12)

Retour direct : les espaces commerçant/annonceur "ne faisaient pas vrai
site" et le design manquait de caractère. Reconstruit en plusieurs
passes plutôt qu'un simple restylage — voir aussi l'étape "coquille
d'application" ci-dessus (sidebar, tableaux de bord chiffrés).

- **Mode sombre entièrement retiré** ("ne sert à rien") : `next-themes`
  désinstallé, `ThemeProvider`/`ThemeToggle` supprimés, bloc CSS `.dark`
  et `@custom-variant dark` retirés de `globals.css`. Un seul thème
  clair, plus simple à maintenir et à tester.
- **Calendrier personnalisé** (`components/date-picker.tsx`) en
  remplacement de `<input type="date">`, dont le rendu dépend
  entièrement du navigateur/OS (capture d'écran fournie montrant un
  calendrier espagnol par défaut, incohérent avec le reste du site).
  Aucune librairie : grille de mois calculée à la main, popover
  positionné en absolu, fermeture au clic extérieur.
- **Landing page** : accent manuscrit (SVG) et police italique jugés
  "pas professionnels" — retirés. Le mock d'affiche générique du hero a
  été remplacé par une vraie photo (vitrine parisienne, licence
  Unsplash, téléchargée dans `public/images/`) et la section galerie
  affiche désormais de vraies photographies (concert, théâtre, mode,
  affichage urbain — cf. demande explicite de ne pas se limiter à la
  mode) au lieu de mocks CSS. Deux photos candidates écartées en cours
  de route car elles montraient un vrai théâtre nommé et le nom d'un
  humoriste réel dans la programmation affichée — remplacées par des
  photos plus neutres pour ne pas laisser croire à un partenariat
  inexistant.
- **Connexion "Continuer avec Google"** (`apps/api/src/auth/strategies/google.strategy.ts`,
  `guards/google-auth.guard.ts`) : OAuth2 classique via Passport.
  `GET /auth/config` indique si Google est configuré
  (`GOOGLE_CLIENT_ID`/`SECRET` optionnels dans `env.validation.ts`) —
  le bouton reste masqué côté front tant que ce n'est pas le cas,
  jamais de bouton mort avant que l'utilisateur ne fournisse ses
  propres clés (même pattern que Stripe). Un compte existant est
  reconnecté par email quel que soit son mode d'inscription d'origine ;
  une inscription **Google n'est proposée que pour ANNONCEUR** — un
  commerçant nécessite des informations qu'OAuth ne fournit pas
  (SIRET, adresse) et que le schéma actuel exige à la création du
  profil, sans état "compte incomplet" prévu pour l'instant. Testé de
  bout en bout avec de fausses clés temporaires dans `.env` (jamais
  commitées) : bouton visible/masqué selon la config, flux visible sur
  login et sur l'inscription annonceur uniquement.
- **Page recherche repensée sur mobile** ("le bouton Rechercher n'est
  pas clair") : carte plein écran + feuille coulissante en bas
  (`components/bottom-sheet.tsx`, pointer events, glisser ou taper la
  poignée) listant les commerces à proximité, façon Google Maps/Airbnb
  — suggestion venue directement de l'utilisateur. Bug réel corrigé en
  testant : la barre de recherche flottante et la feuille disparaissaient
  derrière les contrôles Leaflet (zoom, popups), qui utilisent un
  z-index ~1000 en interne — corrigé avec un z-index plus élevé sur nos
  éléments superposés. Desktop inchangé (carte + liste côte à côte).
- Refus maintenus : quatre nouveaux liens de "plugins design" proposés
  au fil de la conversation (`taste-skill`, `impeccable`,
  `awesome-design-md`, `microsoft/playwright-cli`) — les trois premiers
  présentaient le même profil que `ui-ux-pro-max-skill` refusé plus tôt
  (comptes obscurs, nombre d'étoiles GitHub totalement disproportionné,
  instructions explicitement écrites pour qu'un agent IA s'auto-installe
  sans revue humaine) ; le quatrième est légitime mais superflu (Playwright
  tournait déjà en local pour tous les tests de ce projet).

### Connexion Google — vraies clés, calendrier avec disponibilités (étape 13)

- Vraies clés Google fournies par l'utilisateur (Client ID/Secret, dans
  `apps/api/.env`, jamais commitées) : flux testé jusqu'à la vraie page
  de connexion Google, qui reconnaît déjà "MiVitrina" comme client
  OAuth. Écran de connexion/inscription reconstruit en deux étapes
  (bouton(s) externe(s) → "Continuer avec email" qui révèle le
  formulaire) suite à une capture de référence de l'utilisateur —
  "Apple" n'a pas été ajouté (compte développeur payant, 99$/an,
  refusé par l'utilisateur pour l'instant).
- **Calendrier de réservation** (`components/date-picker.tsx`), deux
  bugs réels trouvés en testant avec de vraies données :
  1. Le panneau était tronqué par `overflow-hidden` du composant `Card`
     parent (visible sur une capture fournie par l'utilisateur) — corrigé
     en rendant le panneau via un **portail React** (`createPortal` dans
     `document.body`), positionné en `fixed` à partir du
     `getBoundingClientRect()` du champ, recalculé au scroll/resize.
  2. Les dates déjà réservées ne s'affichaient pas en rouge malgré des
     données correctement récupérées : le parseur de dates courtes
     (`"2026-09-20"`) était réutilisé tel quel sur les datetimes ISO
     complets renvoyés par l'API (`"2026-09-20T00:00:00.000Z"`), lui
     ajoutant un second suffixe d'heure invalide. Corrigé en parsant les
     périodes bloquées avec `new Date(...)` directement.
  - Nouvel endpoint public `GET /discovery/spaces/:id/availability`
    (répercute les mêmes `BLOCKING_STATUSES` que
    `ReservationsService.create`) : purement indicatif pour guider
    visuellement l'annonceur (dates rouges, barrées, non cliquables,
    légende) — le vrai contrôle anti-chevauchement reste dans
    `ReservationsService.create` au moment de la réservation.
  - Testé de bout en bout avec de vraies données (réservation CONFIRMED
    existante) : les jours occupés apparaissent bien en rouge barré et
    Playwright lui-même refuse de cliquer dessus (bouton réellement
    `disabled`), sur desktop et mobile.
- Incident d'infrastructure sans rapport avec le code, rencontré et
  résolu en cours de route : le démon Docker s'était figé (process
  vivant mais socket muet) après une veille système — redémarrage
  complet de Docker Desktop nécessaire. Autre faux positif similaire :
  un cache Next.js corrompu après plusieurs redémarrages rapprochés du
  serveur web produisait une page 500 sur `/login`
  (`SyntaxError: Unexpected non-whitespace character after JSON`,
  aucun rapport avec le JSON des traductions, qui restait valide) —
  résolu par un `rm -rf .next` complet, pas un vrai bug applicatif.

### Vérification d'email et mot de passe oublié — pages manquantes (étape 14)

- Signalement utilisateur : après inscription, aucun email de
  confirmation reçu. Diagnostic : le backend exposait déjà
  `GET /auth/verify-email`, `POST /auth/forgot-password` et
  `POST /auth/reset-password`, et `MailService` envoie réellement via
  Resend dès que `RESEND_API_KEY` est renseigné (sinon il journalise en
  console, `[dev-mail]`) — mais **aucune page frontend n'existait** pour
  ces trois routes : les liens dans les emails pointaient vers des 404.
  C'était donc un vrai trou fonctionnel, pas un problème de
  configuration seul.
- Trois nouvelles pages ajoutées sous `(auth)` :
  `forgot-password/page.tsx`, `reset-password/page.tsx` (lit `?token=`,
  formulaire nouveau mot de passe + confirmation),
  `verify-email/page.tsx` (appelle l'API au montage, affiche
  chargement/succès/erreur avec CTA).
- Nouvel endpoint `POST /auth/resend-verification` (authentifié) +
  `AuthService.resendVerificationEmail()`, et bouton
  `<ResendVerificationButton>` branché dans les deux alertes "email non
  vérifié" des tableaux de bord commerçant/annonceur.
- Testé de bout en bout via l'API réelle (pas de mock) : inscription →
  token de vérification récupéré dans les logs `[dev-mail]` → appel de
  la route → `emailVerified` bascule bien à `true` en base ; mot de
  passe oublié → token de reset → nouveau mot de passe → ancien mot de
  passe rejeté (401), nouveau accepté (200) ; renvoi de vérification
  bloqué (400) sur un compte déjà vérifié ; token bidon rejeté (400).
- En cours de route, le même faux positif de cache Next.js corrompu
  qu'à l'étape 13 est réapparu (500 sur tout le site, pas seulement les
  nouvelles pages) — même remède, `rm -rf .next` puis redémarrage
  propre, confirmé par un nouveau tour de tests complet après coup.
- Reste à faire, côté utilisateur : fournir une vraie clé
  `RESEND_API_KEY` (offre gratuite disponible) pour que les emails
  partent réellement au lieu d'être journalisés en console ; sans
  domaine d'envoi vérifié dans Resend (ex. `mivitrina.es` via DNS),
  l'expéditeur par défaut `onboarding@resend.dev` ne peut typiquement
  envoyer qu'à l'adresse du compte Resend lui-même, pas à n'importe
  quel destinataire.

### Calendrier : jour de départ ignorant la durée de la période (bug réel, étape 15)

- Signalé par l'utilisateur avec capture : réservation existante du 20
  au 26 septembre (durée "par semaine", 7 jours) correctement affichée
  en rouge sur le calendrier ; mais en cliquant sur le 19 (non rouge),
  l'API refusait quand même la réservation ("Cet espace est déjà
  réservé sur cette période").
- Cause : `DatePicker.isBlocked(day)` ne testait que si **le jour
  lui-même** tombait dans une période déjà réservée, sans tenir compte
  de la durée de la réservation en cours de création. Le 19 n'est pas
  occupé en soi, mais choisir le 19 avec une durée de 7 jours crée une
  période 19→26 qui chevauche la réservation existante 20→27
  (exclusif) — exactement le chevauchement que l'API détecte à la
  création (`reservations.service.ts`, `startDate < endDate existant
  && endDate > startDate existant`).
- Corrigé en ajoutant une prop `computeRangeEnd` à `DatePicker` : pour
  chaque jour du calendrier, on calcule la date de fin de la période
  qui démarrerait ce jour-là (même fonction `computeEndDate` que le
  reste de la page, tenant compte de semaine/mois/durée libre) et on
  teste le chevauchement avec cette période complète, pas seulement le
  jour. Même sémantique d'intervalle (fin exclusive) que le contrôle
  serveur, pour rester cohérent.
- Vérifié par un test direct reproduisant les dates exactes du
  signalement (réservation bloquée 20→27 exclusif, durée 7 jours) :
  les jours 14 à 26 sont maintenant correctement marqués bloqués comme
  départ (avant : seuls 20 à 26 l'étaient), 13 et 27+ restent libres.

### Vraie clé Resend, et un vrai bug trouvé en la testant (étape 16)

- L'utilisateur a fourni une vraie clé API Resend (`apps/api/.env`,
  jamais commitée). Domaine `mivitrina.es` pas encore acheté → `from`
  temporairement réglé sur `onboarding@resend.dev` (adresse de test
  Resend, fonctionne sans domaine vérifié) au lieu de
  `no-reply@mivitrina.es`, qui aurait été refusé.
- **Bug réel trouvé en testant avec la vraie clé** : le SDK `resend`
  (v4) ne lève pas d'exception sur une erreur API — il renvoie
  `{ data, error }`. `MailService.send()` ignorait `error`, donc un
  envoi refusé par Resend (ex: domaine non vérifié) passait pour un
  succès aux yeux du code appelant, sans aucune trace. Corrigé en
  vérifiant `error` et en le relayant.
- Conséquence de ce premier correctif : comme `AuthService.register()`
  attendait l'envoi d'email sans `try/catch`, une erreur désormais
  levée y aurait fait échouer **toute l'inscription** alors que le
  compte était déjà créé en base. Corrigé en encadrant l'envoi (dans
  `register` et `forgotPassword`) d'un `try/catch` qui journalise
  l'échec sans jamais bloquer la réponse — l'email peut toujours être
  redemandé via "Renvoyer l'email de vérification".
- Testé de bout en bout avec de vrais appels à l'API Resend (pas de
  mock) : `GET /emails` confirme `last_event: "delivered"` pour un
  compte réel (`felixing25@gmail.com`, seule adresse autorisée par ce
  compte Resend tant qu'aucun domaine n'est vérifié) ; le token extrait
  du vrai contenu HTML reçu (`GET /emails/:id`) active bien
  `emailVerified` en base une fois "cliqué" ; la réinitialisation de
  mot de passe part aussi réellement. Testé aussi le cas d'échec (email
  vers un destinataire non autorisé) : Resend le refuse (403), l'erreur
  est journalisée, mais l'inscription renvoie quand même 201.
- Reste à faire pour un envoi à n'importe quel destinataire réel :
  acheter le domaine `mivitrina.es`, le vérifier dans Resend (DNS), puis
  repasser `RESEND_FROM_EMAIL` sur `no-reply@mivitrina.es`.

### Recentrage Espagne : langues ES/EN, français retiré (étape 17)

- Décision produit : lancement centré uniquement sur l'Espagne pour
  commencer (au lieu de France + Espagne). Le français est retiré des
  langues du site, remplacé par l'anglais — nouvelles langues : **ES /
  EN**.
- `SUPPORTED_LOCALES`/`DEFAULT_LOCALE` (`packages/shared`) passent de
  `["fr","es"]`/`"fr"` à `["es","en"]`/`"es"`. `messages/fr.json`
  supprimé, `messages/en.json` créé (traduction complète, même
  structure de clés que `es.json`, vérifiée programmatiquement —
  aucune clé orpheline dans un sens ou l'autre).
- **Migration base de données** (`Locale` Prisma, stockée par
  utilisateur pour la langue des emails) : `{FR, ES}` → `{ES, EN}`.
  Postgres ne permettant pas de retirer une valeur d'enum utilisée par
  des lignes existantes, la migration recrée le type et migre les
  données au passage (`FR` → `ES`) avant de le faire — 39 comptes de
  test `locale=FR` basculés sans perte, vérifié par requête directe
  avant/après.
- `Country` (marché commerçant, FR/ES) reste inchangé dans le schéma —
  **volontairement dormant plutôt que supprimé** : la France pourra être
  rouverte plus tard sans nouvelle migration. Seule l'UI change : le
  sélecteur de pays est retiré du formulaire d'inscription, le pays est
  désormais toujours envoyé comme `ES`.
- Carte de recherche (`recherche-client.tsx`) : centre par défaut
  (utilisé si la géolocalisation est refusée) passé de Paris
  (48.8566, 2.3522) à Madrid (40.4168, -3.7038).
- **Inscription** : la langue de navigation courante (es/en) est
  désormais envoyée explicitement comme `locale` à l'inscription
  (`register/page.tsx` via `useLocale()`) plutôt que déduite du pays —
  un visiteur qui navigue en anglais reçoit ses emails en anglais dès
  le départ, indépendamment du pays.
- **Emails transactionnels localisés** : jusqu'ici les emails de
  vérification/reset étaient toujours en français en dur, quelle que
  soit la langue de l'utilisateur — incohérent avec un site
  maintenant ES/EN. Ajout d'un dictionnaire `EMAIL_CONTENT` (ES/EN)
  dans `auth.service.ts`, sélectionné via `user.locale`. Vérifié avec
  de vrais envois Resend : un compte de test basculé en `locale=EN`
  reçoit bien un email au sujet "Reset your MiVitrina password" (au
  lieu du texte français figé précédent).
- **Audit et correction du texte français codé en dur** (bug plus
  large que prévu, découvert en vérifiant le changement de langue) :
  une bonne partie du tableau de bord, de la messagerie, de la
  recherche, du calendrier et de la double confirmation photo
  affichait du texte français en dur dans le JSX, sans passer par
  next-intl — donc invisible au changement de fichier de langue, et
  déjà incohérent avant même ce recentrage pour un visiteur naviguant
  en espagnol. Fichiers corrigés (nouvelles clés `Dashboard`,
  `Vitrine`, `Pricing`, `Reservations`, `Messages`, `Recherche`) :
  tableau de bord (commerçant/annonceur), gestion de vitrine (espaces,
  tarifs, photos), liste et carte de réservation, page de réservation,
  double confirmation photo (pose/retrait), messagerie, recherche
  géolocalisée, carte Stripe Connect, toast de statut de paiement,
  fiche commerce publique, bouton de renvoi de vérification.
- **Bug additionnel trouvé en creusant `date-picker.tsx`** : les noms
  de mois et les initiales des jours de la semaine étaient formatés en
  `fr-FR` en dur (`Intl.DateTimeFormat`), donc le calendrier de
  réservation restait entièrement en français quelle que soit la
  langue du site. Corrigé en dérivant dynamiquement le tag de langue
  (`es-ES`/`en-GB`) depuis `useLocale()`, avec les initiales des jours
  générées via `Intl.DateTimeFormat(locale, { weekday: "narrow" })`
  plutôt que codées en dur (important : les initiales françaises et
  espagnoles diffèrent, ex. mercredi = "M" en français mais "X" en
  espagnol).
- Portée assumée : les pages d'administration (`admin/disputes`,
  `admin/settings`) n'ont pas été auditées dans cette passe — outil
  interne réservé à l'exploitant de la plateforme, pas aux
  commerçants/annonceurs, jugé non prioritaire pour ce recentrage.
  Signalé à l'utilisateur comme reste à faire si souhaité.

### Menu latéral oublié, et inscription commerçant en plusieurs étapes (étape 18)

- Signalé par l'utilisateur avec capture : le menu latéral de
  l'application (`AppShell` — "Tableau de bord", "Rechercher", "Mes
  réservations", badge "Commerçant"/"Annonceur") était resté
  entièrement en français malgré le recentrage ES/EN de l'étape 17.
  Cause : la méthode de balayage précédente cherchait un accent suivi
  d'un espace (`"é "`), qui rate des mots comme "Réservations" ou
  "Commerçant" où l'accent est suivi d'une autre lettre. Nouveau
  balayage sur toute présence d'accent (plus fiable), qui a aussi
  trouvé et corrigé : le séparateur "ou" et les boutons "Continuer
  avec Google/email" des pages login/register, le titre et message
  vide de `/mes-reservations`, les statuts dupliqués et non traduits
  de `RecentReservationsList` (avec au passage le même bug de date
  `fr-FR` en dur que `ReservationCard` — mutualisé dans un nouvel
  utilitaire `lib/date-locale.ts`), les aria-label de navigation du
  calendrier et de la feuille de recherche mobile. Au passage, le
  libellé "Rechercher" devient "Buscar comercios"/"Find shops" (plus
  explicite, demandé par l'utilisateur).
- **Inscription commerçant repensée en assistant à 3 étapes** (compte
  → commerce → adresse) avec animation de glissement, plutôt qu'un
  unique long formulaire — demande explicite de l'utilisateur.
  Nouveau composant générique `components/step-wizard.tsx` : panneaux
  posés côte à côte, `transform: translateX()` pour glisser vers
  l'étape active, hauteur du conteneur suivie dynamiquement via
  `ResizeObserver` (les étapes n'ont pas le même nombre de champs) —
  même philosophie que `Reveal` (pas de librairie d'animation,
  CSS pur, `prefers-reduced-motion` respecté).
  - Chaque étape est validée avant de pouvoir avancer
    (`reportValidity()` sur les champs concernés + vérification
    manuelle de la correspondance des mots de passe à l'étape 1) —
    pas de soumission finale tant qu'une étape antérieure est invalide.
  - La touche Entrée avance d'étape au lieu de tenter une soumission
    native prématurée du formulaire entier (qui aurait autrement
    déclenché la validation de champs pas encore affichés, situés
    hors-écran par la translation).
  - Indicateur de progression ("Paso 2 de 3" + barre) au-dessus du
    formulaire.
  - Le parcours annonceur (email/mot de passe/société, un seul écran)
    reste inchangé — pas demandé par l'utilisateur, pas concerné par
    la complexité qui justifiait de découper le formulaire commerçant.
  - Vérifié : le payload final envoyé à `POST /auth/register` est
    resté strictement identique (même test API direct que
    précédemment, 201), seule la présentation a changé.

### L'alerte "email non vérifié" ne disparaissait pas après vérification (étape 19)

- Signalé par l'utilisateur avec capture (tableau de bord commerçant
  "Café des Arts") : l'alerte persistait après avoir cliqué le lien de
  vérification. Deux causes distinctes trouvées :
  1. Les deux comptes démo (`demo.commercant@mivitrina.es`,
     `demo.annonceur@mivitrina.es`) avaient réellement `emailVerified
     = false` en base — créés par appel API direct au tout début de
     cette conversation, avant même l'existence de la fonctionnalité
     de vérification. Corrigé directement en base pour ces deux
     comptes (mot de passe du compte annonceur aussi réinitialisé au
     passage, faute de connaître l'original).
  2. **Bug réel** dans `verify-email/page.tsx` : le bouton "Ir a mi
     panel" utilisait un simple `<Link href="/dashboard" />`
     (navigation client). Le tableau de bord ayant presque
     certainement déjà été visité juste avant (l'alerte n'apparaît que
     dessus), le cache de navigation client de Next.js pouvait
     resservir la version obsolète (email non vérifié) au lieu de
     refaire l'appel serveur `GET /auth/me`. Corrigé en remplaçant par
     `router.push("/dashboard")` + `router.refresh()` — même schéma
     déjà utilisé avec succès après connexion (`login/page.tsx`).
     Vérifié côté serveur (curl direct sur `/auth/me` avant/après
     l'appel à `GET /auth/verify-email`, avec un compte de test créé
     pour l'occasion et un token signé manuellement avec
     `EMAIL_TOKEN_SECRET` — Resend ne pouvant pas livrer à une adresse
     de test arbitraire) : la donnée bascule bien côté serveur ; le
     rechargement client lui-même n'est pas testable par curl (pur
     comportement navigateur), la correction reprend un schéma déjà
     éprouvé ailleurs dans le code.
  - Au passage : encore un texte français oublié malgré les
    précédents balayages, cette fois sans accent donc invisible à ma
    méthode de recherche ("Se connecter" → "Iniciar sesión"/"Log in").
    Confirme que le sweep par accents ne peut pas être exhaustif —
    reste un risque résiduel pour tout mot français sans caractère
    accentué.

## Soporte al cliente (tickets)

Canal usuario ↔ equipo para consultas generales, problemas técnicos y dudas de pago,
**separado del chat** anunciante-comerciante (que trata de una reserva concreta entre dos
partes). Tablas propias (`SupportTicket`, `SupportMessage`) en vez de reutilizar
`ChatThread`, que exige comerciante + anunciante y es único por pareja.

- **Modelo**: ticket con número legible, estado (OPEN → IN_PROGRESS → RESOLVED → CLOSED),
  categoría (Pago, Reserva, Cuenta, Técnico, Otro) y prioridad (Normal/Urgente, solo la fija el
  equipo). Un mensaje puede ser una **nota interna** (`isInternal`): nunca sale hacia el usuario
  (las consultas de `SupportService` filtran siempre `isInternal: false` y solo seleccionan
  `content`, `fromStaff`, `createdAt`).
- **Usuario** (`/soporte`, `/soporte/[id]`; API `/support/*`): abrir solicitud, ver las suyas y
  responder. Responder a un ticket Resuelto lo reabre; uno Cerrado no admite respuestas
  (`TICKET_CLOSED`). Tope de 5 tickets activos por usuario. Sin la moderación anti-contacto del
  chat: en soporte hay que poder dar email o teléfono.
- **Equipo** (`/admin/support`; API `/admin/support/*`, permiso `support.manage` = SUPERADMIN y
  SUPPORT): bandeja con filtros (estado, categoría, urgentes, "espera respuesta", búsqueda por
  #número/asunto/email), detalle con datos de la cuenta y sus últimas reservas (enlace a la ficha
  de usuario, que muestra todas), respuesta, nota interna y cambio de estado/prioridad. Los
  cambios de estado y prioridad se registran en la auditoría (`support.ticket_update`).
- **Avisos**: email al usuario cuando el equipo responde (en su idioma, con el texto escapado y
  recortado; un fallo de envío no pierde la respuesta) y un indicador de "sin leer" en el menú
  (`/support/unread-count`, refresco cada 30 s, al cambiar de página y tras leer/responder). La
  tabla `Notification` sigue sin usarse: nada la escribe ni la lee. El menú de admin muestra los
  tickets que esperan respuesta (`/admin/support/awaiting-count`).
- **Sin websockets**: el hilo se refresca por polling (8 s usuario, 10 s equipo) solo con la
  pestaña visible, para no marcar como leído lo que nadie ha visto.
