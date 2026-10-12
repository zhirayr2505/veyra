-- Two-phase deletion: hidden immediately, reversible for exactly 72 hours.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK(status IN ('active','banned','deleting','deleted'));
ALTER TABLE users ADD COLUMN deletion_requested_at timestamptz;
ALTER TABLE users ADD COLUMN deletion_due_at timestamptz;
ALTER TABLE users ADD COLUMN deletion_snapshot jsonb;
CREATE INDEX users_pending_deletion ON users(deletion_due_at) WHERE status='deleting';
