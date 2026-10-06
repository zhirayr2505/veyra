# Security and operations

## Boundaries

All API authorization is server-side. Telegram initData uses official HMAC validation, duplicate-key rejection and a one-hour freshness limit. Opaque random session tokens are kept only in frontend memory; only SHA-256 hashes are stored in PostgreSQL, expire in 12h, and are revoked on ban/delete. Admin scope requires both the admin bot signature and configured owner Telegram ID. No production test-login route exists.

The veyra schema has RLS enabled; no anon/public policies are created. The backend DB role owns/accesses its tables. Supabase client API keys are never shipped to the client. Private photos pass through an authenticated endpoint, checking owner/admin/view/match/like entitlement and blocks. Files are decoded and re-encoded via Sharp, stripping metadata; metadata/MIME assertions alone are not trusted. Image processing is bounded to 20M pixels and 5 MiB incoming uploads.

API schema validation, parameterized SQL, explicit whitelists for dynamic table/column references, mutation Origin checks, Content Security Policy, Redis request limits and per-feature limits are active. `trust proxy=1` assumes the single Render edge proxy; reassess this when changing hosting.

Mutual likes use ordered user locks, unique pair constraints and transactions. Review revisions prevent approval of changed content. Messages use membership checks plus per-sender client UUID uniqueness. Blocking ends existing matches. Payment orders snapshot server catalog prices; client invoice prices/fulfillment are never accepted. Pre-checkout does not grant anything; signed webhook transport and successful_payment determine settlement. Unique charge/order keys prevent replay grants. A precheckout ID reserves an order to prevent two checkouts from consuming the same invoice. Intro-offer reservations deliberately fail closed on ambiguity; an owner may need to resolve an abandoned reservation before issuing another introductory order.

Refund requests are recorded before the external API call. Successful API response or Telegram refunded_payment update reconciles state. Pending ambiguous refunds stay recorded; do not manually grant credits without checking Telegram's transaction ledger. A refunded consumed item cannot undo real-world use; remaining inventory is clamped to zero and Premium duration is reduced.

## Notifications and jobs

The SQL outbox retries with exponential backoff up to eight attempts, using row locking. Owner dashboard reports exhausted jobs. Telegram sendMessage offers no idempotency key, so a crash between send success and DB commit can duplicate a notification; financial entitlements remain idempotent. The worker runs only while the web service is awake. Critical support/payment notices bypass the user's optional social-notification toggle.

Photo deletion queues object keys in `storage_gc`; the worker deletes object bytes and then clears the queue. A storage outage delays byte deletion, but API access is revoked as soon as DB references are removed. Monitor orphan upload cleanup after storage-success/database-failure edge cases.

Readiness checks database and Redis; startup also validates Storage. Logs include route/error class only, not request bodies, initData, tokens, URLs with credentials or message content. Admin audit records access-sensitive actions, moderation, bans, exports and payment changes.

## Backup and restore

`scripts/backup.js` streams `pg_dump --schema=veyra` into gzip and AES-256-GCM using `BACKUP_ENCRYPTION_KEY` (64 hex characters) to an operator-selected local file. It requires the PostgreSQL client binary on the backup runner. Schedule on a secured external runner, not Render's ephemeral Free filesystem. Save backups off-project; keep the encryption key separately. Photos require separate Storage backups/version retention. No backup has been run or scheduled by this build.

Restore: decrypt using `scripts/restore-backup.js <encrypted-file> <output.sql.gz>` in a trusted environment, decompress and review, restore to a separate staging database, run migrations and integrity tests, only then schedule a production restore. Restoration is a destructive operator action, never an app endpoint.

## Secret rotation

Bot token rotation invalidates fresh login signatures and changes derived webhook secrets. Update Render variables, redeploy/setup both bots, revoke existing sessions if appropriate. Rotate Supabase/DB/Redis secrets via provider dashboards and update only runtime environment. Source scanning complements `.gitignore` and `.dockerignore`; it is not a substitute for account secret management.

## Launch acceptance still pending

- Live Render healthy instance and external URL.
- Supabase TLS/session pooler connection and private-bucket access with valid key.
- Upstash and Geoapify responses.
- Two real Telegram accounts, separate admin login, photo upload + manual moderation.
- Mobile Android WebView visual pass, portrait/landscape, keyboard, back gesture and safe areas.
- Stars invoice/precheckout/successful payment/refund; verify cold-start behavior.
- Backup restore drill; operator identity/contacts and final terms before commercial launch.
