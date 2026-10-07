ALTER TABLE profiles ADD COLUMN smoking text NOT NULL DEFAULT '' CHECK(smoking IN ('','no','sometimes','yes'));
ALTER TABLE profiles ADD COLUMN leisure text NOT NULL DEFAULT '' CHECK(leisure IN ('','active','quiet','depends'));
ALTER TABLE profiles ALTER COLUMN accepted_terms_at DROP NOT NULL;
CREATE TABLE registration_drafts (
 user_id bigint PRIMARY KEY REFERENCES users(id),
 step integer NOT NULL CHECK(step BETWEEN 1 AND 5),
 data jsonb NOT NULL DEFAULT '{}',
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE registration_drafts ENABLE ROW LEVEL SECURITY;
