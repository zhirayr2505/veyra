-- Real per-user view receipts for mutual matches.
CREATE TABLE match_views (
 match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
 user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 seen_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(match_id,user_id)
);
CREATE INDEX match_views_user ON match_views(user_id,seen_at DESC);
ALTER TABLE match_views ENABLE ROW LEVEL SECURITY;
