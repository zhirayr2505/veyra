-- Opt-in, non-exclusive, paid courtship markers. Public only after consent AND Stars settlement.
CREATE TABLE courtships (
 id uuid PRIMARY KEY,
 sender bigint NOT NULL REFERENCES users(id),
 recipient bigint NOT NULL REFERENCES users(id),
 match_id uuid NOT NULL REFERENCES matches(id),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','payment_pending','active','declined','cancelled','revoked')),
 order_id uuid UNIQUE REFERENCES orders(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 responded_at timestamptz,
 activated_at timestamptz,
 expires_at timestamptz,
 CHECK(sender<>recipient),
 UNIQUE(sender,recipient)
);
CREATE INDEX courtships_public ON courtships(recipient,expires_at DESC) WHERE status='active';
CREATE INDEX courtships_incoming ON courtships(recipient,created_at DESC) WHERE status='pending';
ALTER TABLE courtships ENABLE ROW LEVEL SECURITY;
