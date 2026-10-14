# VEYRA — Current handoff (Stage 0, 2026-10-14)

**Status: backup-blocked / production reset NOT executed.**

Continue work in PR #75 on branch `fix/remove-demo-backup-gated-2026-10-14` only. The historical synthetic-profile demo was retired. Never call the deleted owner demo seed route; it no longer exists. No synthetic cards, demo banners or mock matches should appear in production UI.

Base production main: `3e358d34addd16d2f93e60d6f9a79038a34c92f1` before Stage 0 changes.
Production Render: `https://veyra-3806.onrender.com`.
Reset ID (staged but inactive): `registration-clean-2026-10-14-v1`.

See `docs/STAGE0_CLEAN_RESET_RUNBOOK.md` for exact backup/restore requirements and safety gates. **Do not call** the one-time reset without real, separately restorable PostgreSQL and Supabase Storage backups. The reset has no startup hook or public API; even deployment does not automatically execute it.

Run `npm run typecheck`, `npm run lint`, `npm run check`, `npm run secrets:check` and Chromium V5 CI. Do not claim production completion until backups, guarded reset, payment invariants, Render Live commit revision, /healthz, /readyz and fresh Telegram registration have all been verified.
