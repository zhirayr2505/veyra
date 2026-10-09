# VEYRA operations update

## Deploy

Use the existing Render Docker service and its existing secrets. No new credentials are required. Startup applies additive migrations `008_experience.sql` and `009_content.sql`, then verifies the private Supabase `veyra-media` bucket. The old launch-time account reset is retired and is no longer called. Back up the database before applying migrations in production.

The 90-day product is initially 420 Stars and can be changed in the owner console. Existing invoices retain the price and entitlement captured when they were created. Payment availability remains controlled by the existing `payments` feature flag.

## Roles

Open `/admin` through the Admin Bot. The configured owner can assign `moderator` or `support` to an existing active Telegram user under **Управление и аналитика → Администраторы**. Revoking or changing a role immediately expires that user's admin sessions. User-bot authentication never grants admin scope.

- Owner: all operations, payments, exports, pricing, roles, broadcasts and configuration.
- Moderator: pending profiles, approval/rejection (including confirmed batches), reports and profile photos. No private conversation archive, payment records or exports.
- Support: tickets and replies. No profile moderation or financial/role operations.

Admin Bot commands include `/user ID`, `/approve ID REVISION`, `/changes ID reason`, `/suspend ID reason`, `/premium ID days`, `/boost ID quantity`, `/reports`, `/payments`, `/flags`, `/review`, `/reject`, `/stats`, `/queue`, `/support`, `/export` and `/broadcast`. Commands enforce the same role boundaries; sensitive bulk operations direct the administrator to the console. Payment grants and suspension are audited. Telegram webhook deduplication also covers command grants.

## User features

- Undo is Premium-only and affects only the latest unmatched action; it never refunds daily usage or paid consumables.
- Full profiles require a discovery, reaction or match entitlement. Blocks revoke access.
- Synthetic test profiles explicitly identify themselves; only their reserved IDs reciprocate automatically. Normal users never receive fabricated likes or activity.
- Profile location is rounded before storage. Editing location records consent and update time; public profiles expose city and approximate distance only.
- Boost history counts reactions and impressions occurring within each run's time window. Historical impression timestamps predating this update use the recorded day.
- Support keeps a message history. Members can close and reopen their own tickets; staff replies are retained and sent through the existing notification outbox.
- Today content contains general meeting ideas, not invented venue listings. Interest is private to the member. Owners manage Today and additional FAQ content in the console.
- Broadcasts are inert drafts until the owner confirms queueing. Sending is idempotent and respects active accounts and notification preferences.
- XLSX exports use explicit safe projections, literal string cells and a 10,000-row cap. Narrow the search for larger datasets. Full existing CSV/ZIP exports remain owner-only; export actions are audited.

## Verification

`npm test` covers backend domain/API/storage/payment/moderation behavior. `npm run typecheck` checks the JavaScript backend with TypeScript; frontend verification uses ESLint, Vite and browser integration tests. `npm run lint` covers backend, frontend, scripts and tests. `npm run secrets:check` scans tracked/candidate files without printing secret contents.

`npm run test:e2e` uses isolated PGlite and storage fixtures on ports 3100/3101, with separate application and chat projects. Set `CHAT_CHROMIUM_PATH` to an existing Chromium executable when needed; no browser reinstall is necessary. Fake microphone input is confined to browser tests. Real Stars charges and live broadcasts are never part of these tests.

Current limitation: onboarding retains the existing compact five-step flow instead of splitting each field into 14 pages. Core pages support Russian/English; some newly added experience and administration copy remains Russian. Live Telegram payment confirmation and hardware microphone behavior still require an actual Telegram client; browser tests cannot certify those external paths.
