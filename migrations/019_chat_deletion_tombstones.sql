-- Preserve archived conversations without ever linking them to a new account
-- that later reuses the same Telegram ID.
ALTER TABLE matches ADD COLUMN a_erased_at timestamptz;
ALTER TABLE matches ADD COLUMN b_erased_at timestamptz;
CREATE INDEX matches_erasures ON matches(a,b) WHERE a_erased_at IS NOT NULL OR b_erased_at IS NOT NULL;
