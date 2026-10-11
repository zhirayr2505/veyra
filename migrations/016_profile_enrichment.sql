-- Non-destructive VEYRA onboarding enrichment. All existing profiles remain valid.
ALTER TABLE profiles ADD COLUMN languages text[] NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN prompts jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(prompts)='array');
ALTER TABLE profiles ADD COLUMN height_cm integer CHECK(height_cm BETWEEN 120 AND 230);
ALTER TABLE registration_drafts DROP CONSTRAINT IF EXISTS registration_drafts_step_check;
ALTER TABLE registration_drafts ADD CONSTRAINT registration_drafts_step_check CHECK(step BETWEEN 1 AND 6);
