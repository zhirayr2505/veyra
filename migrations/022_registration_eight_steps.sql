-- VEYRA v9 introduces a separate biography screen before photos.
-- Preserve existing drafts and widen the validated step range to 1..8.
ALTER TABLE registration_drafts DROP CONSTRAINT IF EXISTS registration_drafts_step_check;
ALTER TABLE registration_drafts
 ADD CONSTRAINT registration_drafts_step_check CHECK (step BETWEEN 1 AND 8);
