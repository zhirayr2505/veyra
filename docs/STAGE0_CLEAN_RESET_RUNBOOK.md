# VEYRA Stage 0 internal recovery runbook — 2026-10-14

Status: **NOT COMPLETE UNTIL VERIFIED SNAPSHOT + RESET + LIVE CHECKS**.
Snapshot and reset ID: `registration-clean-2026-10-14-v1`.
Production only: `https://veyra-3806.onrender.com`.
The feature-branch code does **not** run any job during deployment, startup or reboot. Only an explicitly inserted private database command can start the worker.

## Architecture and guarantees
- `migrations/024_stage0_jobs.sql`: `veyra.stage0_jobs` is a private, RLS-denied SQL-only job inbox with a unique `(id,action)` key. There are no HTTP routes for snapshot or reset.
- `server/stage0-jobs.js`: validates the production origin, Render commit SHA and owner ID against the existing environment. Only claims manually inserted `pending` jobs. It does not automatically retry failed/running jobs or reschedule completed ones.
- `server/stage0-snapshot.js`: logical gzip/JSON snapshot including table definitions and exact row representations; private Supabase Storage copies of every existing working-media object, a checksum manifest, restoration script and validation marker. Restores all dating tables into PostgreSQL temporary tables; restores each copied media object to a separate backup validation prefix and compares bytes with the original. **Only a validated snapshot obtains an audit record.**
- `server/launch-reset.js`: idempotent one-shot deletion transaction. Production guard requires the verified internal manifest, hashes of every dating table and a financial baseline. It locks dating and financial tables, rechecks their SHA-256, preserves all financial tables/rights and queues original media for existing `storage_gc`. The marker in `audit_log` prevents recurrence.
- `scripts/stage0-restore.js`: explicitly confirmed manual disaster recovery to a separate `stage0_restore_20261014` schema in an isolated PostgreSQL instance; verifies all private media hashes. It refuses to run against the live app or using the same `DATABASE_URL`.

No new environment variables or secrets are needed to carry out the private snapshot inside Render. No secret may be copied to PRs, logs or chat. The backup bucket `veyra-stage0-backups` is private and distinct from `veyra-media`; storage path `stage0-backups/registration-clean-2026-10-14-v1/`. Never include this backup bucket in `storage_gc`.

## Actual reviewed production delete allowlist
In FK-safe order (no table-name pattern matching):
```
message_edits, message_hides, message_reactions, message_media,
chat_pins, chat_presence, match_views, courtships, messages, matches,
reactions, impressions, profile_hides, blocks, reports, daily_usage,
today, content_interests, review_bot_messages, registration_drafts,
sessions, photos, profiles
```
Explicitly retained: `orders`, `gifts`, `veys_wallets`, `veys_ledger`, `veys_purchases`, `products`, `promos`, `promo_redemptions`, `feature_flags`, `webhook_updates`, `content_items`, `tickets`, `support_messages`, `boost_runs`, `users`, `outbox`, `audit_log`, `schema_migrations`. Username and first name are cleared on the retained user records; Premium, consumables, referral rights and financial identity remain unchanged.

The reset refuses paid/VEYS-funded courtships, users with in-flight deferred deletion, drift in any dating table, or drift in any financial table/user entitlement/audit prefix. Old active sessions and dating data are removed, but financial user records remain for refunds, checkout and re-registration. The reset is **not** safe to run without the verified snapshot and review of any new FK/schema changes.

## Release sequence — do not skip
1. Review all 26+ changed files, confirm tests, CI and the 13 known pre-existing V5 browser baseline failures are distinguished from Stage 0 regressions. Verify no new browser failure. Do not waive new regressions.
2. Merge PR #75 only after code review and test gating. Confirm new Render deployment LIVE and that `/healthz` revision equals `main`. Check `/readyz` returns 200.
3. Only then manually enqueue snapshot using privileged Supabase project SQL-management permission (never app/anon/auth credentials). This is the admin-only action; only the existing owner account may be its recorded requester:

```sql
INSERT INTO veyra.stage0_jobs (id,action,requested_by)
SELECT 'registration-clean-2026-10-14-v1','snapshot',id
FROM veyra.users WHERE admin_role='owner'
ON CONFLICT DO NOTHING;
```

Verify exactly one owner, inspect `stage0_jobs` and wait for `state='completed'`. If the state becomes `failed`, do not reset. If the state stays `running` following a restart, **do not** blindly re-enqueue or overwrite backups.

4. Inspect the private backup manifest and immutable marker, full byte and SHA-256 checks for every object, original/validation media, exact row counts, temporary-table restoration report and `stage0.snapshot.verified` audit. Verify 6 media photos and 1 profile in the snapshot. Verify the originals still exist and the financial checkpoint is present.
5. Only after all snapshot proof is present and finance invariants have not drifted, manually enqueue one reset:

```sql
INSERT INTO veyra.stage0_jobs (id,action,requested_by)
SELECT 'registration-clean-2026-10-14-v1','reset',id
FROM veyra.users WHERE admin_role='owner'
ON CONFLICT DO NOTHING;
```

6. Verify `stage0_jobs` reset `state='completed'`, `registration.reset` audit, /healthz and /readyz. Check all profile/dating tables empty, original Storage objects zero after the existing GC completes, and the private backup remains accessible. Snapshot, payment and entitlement checksums must match. Only then perform authenticated Telegram Mini App smoke checks (new registration starts at step 1 and no demo controls exist).
7. Do not declare Stage 0 complete until the exact Render SHA is LIVE, the manual reset ran once and financial rights/data exactly match the pre-reset checkpoint. A restart MUST NOT re-run either action.

Never use mock test manifests as production proof. Never execute the restore script in production or via app startup.
