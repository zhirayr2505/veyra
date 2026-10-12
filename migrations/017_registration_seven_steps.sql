-- The 2026 VEYRA registration wizard has seven steps; preserve all prior drafts.
-- Keep the same named constraint so this upgrade is safe on installations with v016.
ALTER TABLE registration_drafts DROP CONSTRAINT IF EXISTS registration_drafts_step_check;
ALTER TABLE registration_drafts
 ADD CONSTRAINT registration_drafts_step_check CHECK (step BETWEEN 1 AND 7);
