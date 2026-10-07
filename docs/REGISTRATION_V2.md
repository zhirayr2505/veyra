# VEYRA registration and graphics release

Owner request: integrate the corrected graphics package, implement approved five-step registration, leave gifts as placeholders, and erase current test registrations so everyone registers again.

- Original logo exports, favicon and navigation sprite; eight optimized illustration families; Premium/match backgrounds and private-photo placeholder. Originals are never redrawn. `public/graphics/provenance.json` links shipped assets to exact package files and SHA256.
- Exactly five steps with saved progress, adult age checks, global city selection, distance and age sliders, optional interests/habits, square reorderable 3–6 photos, consent and manual moderation.
- Photo replacements work at the six-photo limit and retain their position. A failed reorder restores the last saved order; server rejects partial, duplicate or foreign IDs.
- Gift entry points show Coming soon; no paid action is available. Existing Premium/Boost pricing and payment switch are preserved.
- `005_registration.sql` is additive. The separately scoped launch reset runs once on the known test service, only without real payment history; it clears old sessions and personal records and queues old private photographs for deletion. Subsequent restarts preserve new users.
- Reset result is exposed without personal data in `/healthz` so release verification can confirm execution. Administrative audit stores counts. No remote reset endpoint exists.

Verification pending: full browser acceptance and existing-service deployment. Server checks and production build currently pass. CI uses isolated users/providers, never real messages or purchases.
