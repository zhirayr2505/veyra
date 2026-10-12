CREATE TABLE IF NOT EXISTS review_bot_messages(outbox_id uuid PRIMARY KEY,user_id bigint NOT NULL,revision integer NOT NULL,chat_id bigint NOT NULL,message_id bigint NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS review_bot_messages_profile ON review_bot_messages(user_id,revision);
