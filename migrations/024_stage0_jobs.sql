-- Stage 0 only: an audited, database-admin-controlled one-off job inbox.
-- No client or HTTP permissions. It does not run jobs on migration/deploy.
CREATE TABLE stage0_jobs (
 id text NOT NULL CHECK (id='registration-clean-2026-10-14-v1'),
 action text NOT NULL CHECK (action IN ('snapshot','reset')),
 requested_by bigint NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','running','completed','failed')),
 requested_at timestamptz NOT NULL DEFAULT now(),
 started_at timestamptz,
 finished_at timestamptz,
 result jsonb NOT NULL DEFAULT '{}'::jsonb,
 error_code text,
 PRIMARY KEY (id,action)
);
CREATE INDEX stage0_jobs_pending ON stage0_jobs(requested_at) WHERE state='pending';
ALTER TABLE stage0_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON stage0_jobs FROM PUBLIC,anon,authenticated;
