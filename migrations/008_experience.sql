-- Additive upgrade; messages, entitlements and existing profile data are retained.
ALTER TABLE profiles ADD COLUMN location_updated_at timestamptz;
ALTER TABLE profiles ADD COLUMN location_consent_at timestamptz;
ALTER TABLE profiles ADD COLUMN filter_city text NOT NULL DEFAULT '';
ALTER TABLE impressions ADD COLUMN created_at timestamptz;
UPDATE impressions SET created_at=day::timestamptz;
ALTER TABLE impressions ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE impressions ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE profiles DROP CONSTRAINT profiles_moderation_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_moderation_check CHECK(moderation IN ('draft','pending','approved','rejected','suspended','deleted'));
CREATE TABLE profile_hides (
 actor bigint REFERENCES users(id),target bigint REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(actor,target),CHECK(actor<>target)
);
ALTER TABLE profile_hides ENABLE ROW LEVEL SECURITY;
CREATE TABLE boost_runs (
 id uuid PRIMARY KEY,user_id bigint NOT NULL REFERENCES users(id),started_at timestamptz NOT NULL DEFAULT now(),
 ends_at timestamptz NOT NULL,source text NOT NULL CHECK(source IN ('weekly','credit')),
 views_before integer NOT NULL,likes_before integer NOT NULL
);
ALTER TABLE boost_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX boost_runs_user ON boost_runs(user_id,started_at DESC);
ALTER TABLE tickets ADD COLUMN category text NOT NULL DEFAULT 'general' CHECK(category IN ('general','payment','profile','safety','bug'));
ALTER TABLE tickets ADD COLUMN closed_at timestamptz;
ALTER TABLE tickets ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE support_messages (
 id uuid PRIMARY KEY,ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
 sender bigint NOT NULL REFERENCES users(id),is_staff boolean NOT NULL DEFAULT false,
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 3000),created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX support_messages_ticket ON support_messages(ticket_id,created_at,id);
CREATE INDEX reports_pair ON reports(reporter,target);
CREATE INDEX reactions_actor_time ON reactions(actor,created_at DESC);
CREATE INDEX matches_member_b ON matches(b,created_at DESC);
CREATE INDEX matches_member_a ON matches(a,created_at DESC);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE INDEX impressions_target ON impressions(target,day DESC);
CREATE INDEX tickets_user_time ON tickets(user_id,created_at DESC);
CREATE INDEX audit_action_time ON audit_log(action,created_at DESC);
CREATE TABLE broadcasts (
 id uuid PRIMARY KEY,created_by bigint REFERENCES users(id),body text NOT NULL CHECK(length(body) BETWEEN 1 AND 3000),
 audience text NOT NULL CHECK(audience IN ('all','premium')),status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','queued')),
 recipient_count integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now(),queued_at timestamptz
);
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
-- New tariff is additive; existing products and already-created orders keep their values.
INSERT INTO products(sku,title,kind,amount,stars) VALUES('premium_quarter','Premium · 90 days','premium',90,420) ON CONFLICT DO NOTHING;
