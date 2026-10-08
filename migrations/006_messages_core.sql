-- Additive chat upgrade: existing message IDs, content and timestamps are retained.
CREATE SEQUENCE chat_revision_seq;
ALTER TABLE messages ADD COLUMN reply_to uuid REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN original_body text;
ALTER TABLE messages ADD COLUMN edited_at timestamptz;
ALTER TABLE messages ADD COLUMN delivered_at timestamptz;
ALTER TABLE messages ADD COLUMN deleted_at timestamptz;
ALTER TABLE messages ADD COLUMN chat_revision bigint NOT NULL DEFAULT nextval('chat_revision_seq');
UPDATE messages SET delivered_at=read_at WHERE read_at IS NOT NULL;
CREATE INDEX messages_sync ON messages(match_id,chat_revision);
CREATE TABLE message_hides (message_id uuid REFERENCES messages(id) ON DELETE CASCADE,user_id bigint REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(message_id,user_id));
CREATE TABLE message_reactions (message_id uuid REFERENCES messages(id) ON DELETE CASCADE,user_id bigint REFERENCES users(id),emoji text NOT NULL CHECK(length(emoji)<=32),PRIMARY KEY(message_id,user_id));
CREATE TABLE message_edits (id bigserial PRIMARY KEY,message_id uuid REFERENCES messages(id) ON DELETE CASCADE,body text NOT NULL,changed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE chat_presence (match_id uuid REFERENCES matches(id) ON DELETE CASCADE,user_id bigint REFERENCES users(id),seen_at timestamptz NOT NULL DEFAULT now(),typing_until timestamptz,PRIMARY KEY(match_id,user_id));
ALTER TABLE reports ADD COLUMN chat_context jsonb;
ALTER TABLE message_hides ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_presence ENABLE ROW LEVEL SECURITY;
