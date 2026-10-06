# Test deployment on Render Free

## Prerequisites

Private GitHub repository `zhirayr2505/veyra`, connected to Render; a Supabase project, Upstash Redis and Geoapify key. Only the owner can configure account-level settings. This environment has no Render connector/API credential.

The provided Supabase Storage secret string did not match either supported server key format. Use Supabase Project Settings → API Keys → **Secret key** (`sb_secret_...`), or the legacy **service_role** JWT. The database password is not a Storage API key. Never use that key in React or a `VITE_` variable.

## Environment variables

| Name | Use |
| --- | --- |
| USER_BOT_TOKEN | @VeyraAppBot API token, server only |
| ADMIN_BOT_TOKEN | @VeyraAdminBot API token, server only |
| OWNER_TELEGRAM_ID | owner numeric Telegram ID |
| DATABASE_URL | Supabase PostgreSQL session pooler connection string; TLS verified |
| REDIS_URL | Upstash Redis **rediss://** URL; full redis-cli `--tls -u` string also normalized |
| GEOAPIFY_API_KEY | server-only Geoapify key |
| SUPABASE_URL | project URL |
| SUPABASE_SECRET_KEY | privileged server Storage API key |
| APP_URL | optional when RENDER_EXTERNAL_URL exists; public HTTPS origin |
| AUTO_SETUP_BOTS | true on Render; idempotent configuration of webhooks/menu/commands |

`render.yaml` requests all secrets with `sync:false`; it contains no values. Supply them in Render Environment. Never paste credentials into issues, workflow files, commit messages or screenshots.

## Deployment sequence

1. Push this source to the private GitHub repository, including lockfile.
2. Render dashboard → New → Blueprint → select repository → supply variables → deploy Free web service.
3. Startup applies migrations under an advisory lock in the **veyra** schema, leaves other schemas/tables alone, creates the private media bucket if needed, and registers both bots.
4. Check `/readyz` returns `{"ok":true}` and Render shows a healthy deployment. A green build alone is not a health check.
5. Open @VeyraAppBot → Start → Open VEYRA. Create an adult test profile, upload a real consented test photo, submit.
6. Open @VeyraAdminBot as the configured owner → Start → Admin panel. Inspect photo and birth date, then approve. This tests the separate admin bot auth signature.
7. Repeat with a second consenting adult account; verify matching, messaging, block/report and unmatch.
8. In @BotFather configure the main Mini App for @VeyraAppBot to the Render root URL when needed for its profile launch button. The bot's Web App menu/inline button already works without relying on main-app deep links. Referrals use `/start` deep links.
9. Owner enables `payments` only for the live Stars test. Make one deliberate low-price purchase, verify a **successful_payment** update creates the entitlement once, test an owner refund, and inspect ledger/audit. Do not test using fabricated payment callbacks against production.

## Free-plan constraints

A Render Free web service sleeps after inactivity; first request may take around a minute to wake it. Telegram webhooks may be retried. Outbox entries survive because they are in PostgreSQL. A Stars pre-checkout requires a fast response (Telegram's 10s deadline), so a sleeping instance can cause a failed checkout; reopen the Mini App and create a fresh invoice after service wakeup. No always-on uptime or 24/7 low-latency payment SLA is claimed for Free.

The image filesystem is ephemeral. Photos belong in private Supabase Storage; records/sessions/outbox in PostgreSQL; rate counters in Redis. Never rely on local uploads surviving restart. No cron keep-awake service is included.

Official references checked during implementation:
- https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
- https://core.telegram.org/bots/payments-stars
- https://render.com/docs/free

## Failure handling

- Startup DB error: verify session-pooler hostname/port, database password, verified TLS, account/network access. Do not disable TLS to silence hosted-certificate errors.
- Storage 401/403: use the server Secret key or service_role JWT; ensure URL belongs to that project.
- Redis timeout: use TLS rediss:// and correct Upstash endpoint; the service fails closed rather than silently disabling rate limits.
- Bot mismatch: setup validates expected bot usernames before modifying webhook/menu configuration.
- Login error: open via the correct bot. Never trust initDataUnsafe as authentication.
- Payments disabled: use owner panel; payment flag intentionally defaults off.
