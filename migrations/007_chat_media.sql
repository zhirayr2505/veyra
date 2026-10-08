-- Extend the single message model; no existing content or IDs are replaced.
ALTER TABLE messages ADD COLUMN kind text NOT NULL DEFAULT 'text' CHECK(kind IN ('text','voice','image','sticker'));
ALTER TABLE messages ADD COLUMN sticker_id text;
ALTER TABLE messages DROP CONSTRAINT messages_body_check;
ALTER TABLE messages ADD CONSTRAINT messages_body_check CHECK(length(body)<=2000 AND (kind<>'text' OR length(body)>0));
CREATE TABLE message_media (
 message_id uuid PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
 object_key text NOT NULL UNIQUE,
 mime text NOT NULL CHECK(mime IN ('image/webp','audio/mp4')),
 size_bytes integer NOT NULL CHECK(size_bytes BETWEEN 1 AND 12582912),
 width integer,height integer,duration real,waveform jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE message_media ENABLE ROW LEVEL SECURITY;
-- Orphan uploads are scheduled before storage writes; completed messages remove this job.
ALTER TABLE storage_gc ADD COLUMN available_at timestamptz NOT NULL DEFAULT now();
