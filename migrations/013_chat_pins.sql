-- User-specific pinned conversations. Existing messages/matches remain untouched.
CREATE TABLE IF NOT EXISTS chat_pins (
 match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
 user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 pinned_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(match_id,user_id)
);
CREATE INDEX IF NOT EXISTS chat_pins_user ON chat_pins(user_id,pinned_at DESC);
ALTER TABLE chat_pins ENABLE ROW LEVEL SECURITY;
