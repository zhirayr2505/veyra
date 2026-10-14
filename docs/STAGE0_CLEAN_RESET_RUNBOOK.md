# VEYRA Stage 0 — backup-gated clean registration reset (2026-10-14)

Status: **BLOCKED — NO VERIFIED BACKUPS. DO NOT RUN RESET**.

Base production Git revision before this work: `3e358d34addd16d2f93e60d6f9a79038a34c92f1`.
Target: `https://veyra-3806.onrender.com`.
Reset ID: `registration-clean-2026-10-14-v1`.

## Safety invariants
- No production reset endpoint. The reset function in `server/launch-reset.js` must never be called automatically from startup, CI, Render, or a bot.
- Never touch Render service configuration, environment variables, Telegram tokens, Supabase project, bucket settings, products, or checkout settings.
- A *real* encrypted/PostgreSQL-consistent backup must be downloaded and checked before any deletion. A database metadata SQL query or a file list is **not a backup**.
- Independently download **all Storage object bytes** in the existing bucket, preserve original keys and metadata in a manifest; database dump does not contain Storage object bytes.
- Backups must reside in a protected location **outside** the database/Storage project being reset. Protect encryption keys; never commit backups, credentials, or personal data to GitHub.
- Verify checksums, object counts and byte totals. Prove database restoration into a separate isolated PostgreSQL environment and sample/full Storage object restoration into a separate isolated destination. A test manifest with fake IDs/checksums is **not** sufficient.
- Freeze/match concurrent writes to the snapshot before reset, then re-check backup consistency and inspect pending Telegram checkouts and settlements; reserve a maintenance window so no purchases are lost during cutover.
- Get a review of every FK and payment table before actual execution. Preserve paid/refunded orders, accepted/prechecked Telegram checkouts, wallets, ledger, pending refunds, gifted purchases, minimal user records and all audit.
- Compare pre/post row counts and payment invariants, inspect the Storage GC queue, validate /healthz /readyz and re-registration in Telegram.
- Do not declare completion until the exact production Render commit is Live and confirmed.

## Required backup artifact record
A trusted operator must supply *verified* independent records after actual backup/restore inspection:

```json
{
  "postgres": {"id": "actual-backup-id", "sha256": "64-char-real-sha256", "bytes": 1, "restore_tested": true},
  "storage": {"id": "actual-storage-archive-id", "sha256": "64-char-real-sha256", "bytes": 1, "objects": 1, "objects_verified": 1, "restore_tested": true}
}
```

The illustrative values above are not a valid attestation. Current code performs syntactic manifest checks only. **The operator must independently verify file bytes and restoration; do not trust self-declared metadata.**

Suggested PostgreSQL approach with the correctly authenticated, TLS-protected connection: `pg_dump --format=custom --schema=veyra --no-owner --no-acl --file=veyra-2026-10-14.dump "$DATABASE_URL"`; then `pg_restore --list veyra-2026-10-14.dump`, checksum, inspect table counts, test actual restore into an isolated compatible Postgres. Keep raw dumps encrypted and off-site. Ensure payment/authoritative schemas and relevant metadata are in scope.

For Storage: list all objects via authenticated Supabase Storage API, page through the complete bucket, download each object to an encrypted archive with keys and metadata; verify each object hash and that downloaded keys/count match the database; restore representative objects in an isolated bucket/account. **Do not remove originals during backup.**

## Reset execution
No script currently invokes `applyRegistrationReset`. This is intentional. Do not wire it into startup or an HTTP route. The reset logic is staged for review/tests only while backups are blocked. The implementation has been designed to be idempotent using the audit marker and a transaction lock; review and test against a scrubbed, isolated copy before executing production.

## Before marking complete
- [ ] Obtain fresh, restorable Postgres dump and verify SHA and row counts.
- [ ] Obtain independent, restorable Storage backup and verify every object.
- [ ] Audit financial/payment/user foreign keys for any new schema changes.
- [ ] Green typecheck, lint, check, secrets:check and required browser CI.
- [ ] Separate PR review, merge, Live Render SHA check.
- [ ] Carry out manually authorized backup-attested one-shot operation (not deploy-triggered).
- [ ] Confirm profiles and sessions zero; financial tables invariant.
- [ ] Confirm new auth opens registration, demo never recreated.
- [ ] Confirm /healthz contains sanitized one-time result and /readyz is healthy.
