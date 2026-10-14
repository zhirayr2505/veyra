-- Small portrait previews stay private, alongside authenticated photo metadata.
ALTER TABLE photos ADD COLUMN IF NOT EXISTS lqip text;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS dominant_color text;
