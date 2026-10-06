ALTER TABLE orders ADD COLUMN refund_requested boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN refunded_at timestamptz;
