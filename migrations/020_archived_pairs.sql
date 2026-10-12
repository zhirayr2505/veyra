-- A Telegram ID can return as a new account after old conversations were archived.
-- Preserve the old chat rows for the surviving partner while permitting a fresh match.
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_a_b_key;
CREATE UNIQUE INDEX IF NOT EXISTS matches_current_pair_unique ON matches(a,b) WHERE a_erased_at IS NULL AND b_erased_at IS NULL;
