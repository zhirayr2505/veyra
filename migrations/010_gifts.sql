-- Genuine gifts: immutable purchase price, payment linkage and one-time free gift allowance.
CREATE TABLE gifts (
 id uuid PRIMARY KEY,
 sender bigint NOT NULL REFERENCES users(id),
 recipient bigint NOT NULL REFERENCES users(id),
 gift_key text NOT NULL CHECK(length(gift_key) BETWEEN 2 AND 40),
 stars integer NOT NULL CHECK(stars>=0),
 note text NOT NULL DEFAULT '' CHECK(length(note)<=140),
 client_id uuid NOT NULL,
 order_id uuid UNIQUE REFERENCES orders(id),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivered','revoked')),
 created_at timestamptz NOT NULL DEFAULT now(),
 delivered_at timestamptz,
 UNIQUE(sender,client_id),
 CHECK(sender<>recipient),
 CHECK((stars=0 AND order_id IS NULL) OR (stars>0 AND order_id IS NOT NULL))
);
CREATE INDEX gifts_recipient_feed ON gifts(recipient,delivered_at DESC,id) WHERE status='delivered';
CREATE INDEX gifts_sender_free ON gifts(sender,created_at DESC) WHERE stars=0 AND status='delivered';
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
