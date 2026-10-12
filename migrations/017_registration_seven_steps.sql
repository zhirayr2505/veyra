-- Expand registration journey from six steps to seven without deleting existing drafts.
ALTER TABLE registration_drafts DROP CONSTRAINT IF EXISTS registration_drafts_step_check;
ALTER TABLE registration_drafts ADD CONSTRAINT registration_drafts_step_check CHECK(step BETWEEN 1 AND 7);
