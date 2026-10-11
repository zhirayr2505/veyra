-- VEYS: an internal consumable balance. Telegram Stars purchase orders are the only
-- public funding path. The ledger is immutable and every entry is idempotent.
CREATE TABLE veys_wallets (
  user_id bigint PRIMARY KEY REFERENCES users(id),
  balance bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE veys_ledger (
  id uuid PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id),
  delta bigint NOT NULL CHECK(delta <> 0),
  balance_after bigint NOT NULL,
  action text NOT NULL CHECK(action IN ('topup','spend','refund','owner_test')),
  source text NOT NULL,
  reference uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,action,source,reference)
);
CREATE INDEX veys_ledger_history ON veys_ledger(user_id,created_at DESC,id);
CREATE TABLE veys_purchases (
  id uuid PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id),
  client_id uuid NOT NULL,
  sku text NOT NULL,
  cost integer NOT NULL CHECK(cost>0),
  kind text NOT NULL CHECK(kind IN ('superlikes','boosts','prematches')),
  amount integer NOT NULL CHECK(amount>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,client_id)
);
ALTER TABLE gifts ADD COLUMN veys_cost integer NOT NULL DEFAULT 0 CHECK(veys_cost>=0);
ALTER TABLE courtships ADD COLUMN veys_cost integer NOT NULL DEFAULT 0 CHECK(veys_cost>=0);
-- Keep historic paid Stars gifts/courtships valid and refundable.
