# VEYRA

Telegram dating Mini App, API, user bot, admin bot and owner Web Admin. Node 22+, React, PostgreSQL, Redis, Supabase private Storage, Geoapify and Telegram Stars.

**This is implemented application code, but this delivery has not yet been deployed or verified against the user's hosted accounts. See `docs/STATUS.md` for the exact verification boundary and remaining launch gates. No seeded/fake profiles or development login exists in the production server.**

## Run

```sh
npm ci
cp .env.example .env
# Populate real server-side environment variables.
npm run doctor
npm run build
npm start
```

For local API development use `npm run dev:api` and `npm run dev` in separate terminals. Telegram still requires a public HTTPS origin to open the Mini App. `APP_URL` is the origin of the deployed app, without a trailing slash. On Render it defaults to `RENDER_EXTERNAL_URL`.

`npm start` validates required environment names, connects to PostgreSQL and Redis, applies versioned SQL migrations, verifies/creates a **private** `veyra-media` Storage bucket, optionally configures both bots, serves the app, and processes the persistent notification queue. It fails startup if mandatory dependencies are unavailable. TLS certificate checking remains enabled for the hosted database.

## Deployment

Use the supplied `render.yaml` Blueprint (one Free Docker web service). Supply the eight secret/environment inputs in the Render dashboard, never GitHub files. See [deployment guide](docs/DEPLOY.md). Both bots use webhooks on the same service; no long-polling worker is required. `AUTO_SETUP_BOTS=true` registers webhook secrets, commands and Web App menu buttons. It does not send unsolicited launch announcements.

- `/`: Mini App and public Telegram entry screen
- `/admin`: owner Web Admin opened from the admin bot
- `/legal`: test-service terms and privacy description
- `/healthz`: liveness; `/readyz`: DB + Redis readiness
- `/webhooks/user`, `/webhooks/admin`: authenticated Telegram webhooks

## Verify

```sh
npm run check          # PostgreSQL-engine unit/API tests + production frontend build
npm run secrets:check # scans tracked/candidate source files
npm run doctor        # live read-only service diagnostics; requires environment
npx playwright install --with-deps chromium
npm run test:browser  # isolated fixture database, real signed test initData
```

Automated server tests use PGlite (actual PostgreSQL engine compiled to WASM), not an in-memory SQL approximation. External Telegram/Redis/Storage/Geoapify calls are replaced only in the test dependency container. These tests do not certify the Supabase network connection, TLS chain, Render runtime, or Telegram client's actual WebView behavior.

## Implemented flows

- Telegram HMAC authentication, bounded initData lifetime, opaque hashed sessions, separate admin-bot identity, owner-only administration.
- Age/date validation, explicit 18+ consent, profile/preferences, global city search + device geolocation, private photos stripped of metadata and transcoded to WebP, manual review with revision checks.
- Discovery with mutual gender/age compatibility, geographic radius, interests, activity and Boost ranking; free view/like quotas; Premium daily Super Likes; pre-match messages; mutual matches.
- Today plans with activities, time slots and expiry. Internal persistent chat, read receipts, pagination, idempotent message submission; block/report/unmatch; mutual Telegram-handle exchange.
- Premium, Boost inventory/activation, one Premium weekly Boost, Stars invoice/precheckout/successful-payment processing, refund request and refund-update reconciliation, inactive unregistered Robokassa boundary.
- Referral attribution and moderation-triggered rewards, promo redemption with limits/expiry, support tickets and replies, user data export/deletion, user settings.
- User bot commands, admin bot photo cards/statistics/review/approval/rejection, owner Web Admin with user dossiers, CSV exports compatible with Excel, streamed ZIP exports of all or one user's photos and chats, feature toggles, audit log, persistent Telegram outbox and media deletion queue.

The fee/limit decisions restored from prior context and explicit assumptions are recorded separately in [requirements](docs/REQUIREMENTS.md). Payment features start **disabled** to avoid unreviewed purchases before live checkout verification. An owner can enable them from the Web Admin.

## Layout

```
server/       authentication, API routes, domain transactions, integrations, bots
web/          React Mini App and responsive owner administration
migrations/   versioned SQL, isolated veyra schema, RLS
scripts/      setup, diagnostics, backup and secret scanning
 tests/       engine-backed business/API tests and browser flow tests
 docs/        deployment, architecture, status, requirements, operations
```

See [security and operations](docs/OPERATIONS.md) for startup behavior, rate limits, secret rotation, storage deletion and backup/restore. Before a public commercial launch, finish operator/legal details and the live acceptance checklist; this repository does not claim those external steps have happened.
