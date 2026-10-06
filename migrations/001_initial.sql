CREATE TABLE users (
 id bigint PRIMARY KEY, username text, first_name text NOT NULL DEFAULT '', language text NOT NULL DEFAULT 'ru',
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','banned','deleted')),
 created_at timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now(),
 referral_code text UNIQUE NOT NULL, referrer_id bigint REFERENCES users(id), referral_rewarded boolean NOT NULL DEFAULT false,
 premium_until timestamptz, boost_until timestamptz, weekly_boost_at timestamptz,
 superlikes integer NOT NULL DEFAULT 0 CHECK(superlikes>=0), prematches integer NOT NULL DEFAULT 0 CHECK(prematches>=0), boosts integer NOT NULL DEFAULT 0 CHECK(boosts>=0),
 notifications boolean NOT NULL DEFAULT true, invisible boolean NOT NULL DEFAULT false, admin_role text CHECK(admin_role IN ('owner','moderator','support'))
);
CREATE TABLE profiles (
 user_id bigint PRIMARY KEY REFERENCES users(id), name text NOT NULL, birth_date date NOT NULL,
 gender text NOT NULL CHECK(gender IN ('man','woman','other')), looking_for text[] NOT NULL DEFAULT ARRAY['man','woman','other'],
 bio text NOT NULL DEFAULT '' CHECK(length(bio)<=1000), interests text[] NOT NULL DEFAULT '{}', goal text NOT NULL DEFAULT 'relationship',
 city text NOT NULL, country text NOT NULL, lat double precision NOT NULL CHECK(lat BETWEEN -90 AND 90), lon double precision NOT NULL CHECK(lon BETWEEN -180 AND 180),
 min_age integer NOT NULL DEFAULT 18 CHECK(min_age>=18), max_age integer NOT NULL DEFAULT 60 CHECK(max_age>=min_age), radius_km integer NOT NULL DEFAULT 100 CHECK(radius_km BETWEEN 1 AND 20000),
 moderation text NOT NULL DEFAULT 'draft' CHECK(moderation IN ('draft','pending','approved','rejected')), moderation_reason text, revision integer NOT NULL DEFAULT 1,
 accepted_terms_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE photos (id uuid PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id), object_key text UNIQUE NOT NULL, position integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX photos_user ON photos(user_id);
CREATE TABLE sessions (hash text PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id), scope text NOT NULL CHECK(scope IN ('user','admin')), expires_at timestamptz NOT NULL);
CREATE TABLE daily_usage (user_id bigint REFERENCES users(id), day date NOT NULL DEFAULT CURRENT_DATE, views integer NOT NULL DEFAULT 0, likes integer NOT NULL DEFAULT 0, superlikes integer NOT NULL DEFAULT 0, PRIMARY KEY(user_id,day));
CREATE TABLE impressions (viewer bigint REFERENCES users(id), target bigint REFERENCES users(id), day date NOT NULL DEFAULT CURRENT_DATE, PRIMARY KEY(viewer,target,day));
CREATE TABLE reactions (actor bigint REFERENCES users(id), target bigint REFERENCES users(id), kind text NOT NULL CHECK(kind IN ('pass','like','super')), message text CHECK(length(message)<=140), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor,target), CHECK(actor<>target));
CREATE TABLE matches (id uuid PRIMARY KEY, a bigint REFERENCES users(id), b bigint REFERENCES users(id), active boolean NOT NULL DEFAULT true, a_exchange boolean NOT NULL DEFAULT false, b_exchange boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(a,b), CHECK(a<b));
CREATE TABLE messages (id uuid PRIMARY KEY, match_id uuid NOT NULL REFERENCES matches(id), sender bigint NOT NULL REFERENCES users(id), body text NOT NULL CHECK(length(body) BETWEEN 1 AND 2000), client_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz, UNIQUE(sender,client_id));
CREATE INDEX messages_match ON messages(match_id,created_at,id);
CREATE TABLE blocks (actor bigint REFERENCES users(id), target bigint REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor,target), CHECK(actor<>target));
CREATE TABLE reports (id uuid PRIMARY KEY, reporter bigint REFERENCES users(id), target bigint REFERENCES users(id), reason text NOT NULL, details text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE today (user_id bigint PRIMARY KEY REFERENCES users(id), activity text NOT NULL, time_slot text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE products (sku text PRIMARY KEY, title text NOT NULL, kind text NOT NULL CHECK(kind IN ('premium','superlikes','prematches','boosts')), amount integer NOT NULL CHECK(amount>0), stars integer NOT NULL CHECK(stars>0), first_only boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true);
INSERT INTO products VALUES
 ('premium_first','Premium · first 24h','premium',1,10,true,true),('premium_day','Premium · 24h','premium',1,25,false,true),('premium_week','Premium · 7 days','premium',7,65,false,true),('premium_month','Premium · 30 days','premium',30,160,false,true),
 ('super_1','1 Super Like','superlikes',1,9,false,true),('super_5','5 Super Likes','superlikes',5,35,false,true),('super_15','15 Super Likes','superlikes',15,85,false,true),
 ('boost_1','1 Boost','boosts',1,25,false,true),('boost_3','3 Boosts','boosts',3,60,false,true),('boost_10','10 Boosts','boosts',10,160,false,true),('prematch_1','1 pre-match message','prematches',1,10,false,true),('prematch_5','5 pre-match messages','prematches',5,35,false,true);
CREATE TABLE orders (id uuid PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id), sku text REFERENCES products(sku), provider text NOT NULL DEFAULT 'stars', currency text NOT NULL DEFAULT 'XTR', total integer NOT NULL, kind text NOT NULL, amount integer NOT NULL, first_only boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','refunded')), telegram_charge text UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz);
CREATE UNIQUE INDEX first_purchase ON orders(user_id) WHERE first_only=true AND status='paid';
CREATE TABLE tickets (id uuid PRIMARY KEY, user_id bigint REFERENCES users(id), body text NOT NULL, status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')), reply text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE audit_log (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor bigint, action text NOT NULL, subject text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE feature_flags (key text PRIMARY KEY, enabled boolean NOT NULL, config jsonb NOT NULL DEFAULT '{}');
INSERT INTO feature_flags VALUES ('registrations',true,'{}'),('payments',false,'{}'),('today',true,'{}'),('referrals',true,'{"reward_superlikes":1}'),('maintenance',false,'{}');
CREATE TABLE promos (code text PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('premium','superlikes','prematches','boosts')), amount integer NOT NULL CHECK(amount>0), max_uses integer NOT NULL CHECK(max_uses>0), uses integer NOT NULL DEFAULT 0, expires_at timestamptz NOT NULL);
CREATE TABLE promo_redemptions (code text REFERENCES promos(code), user_id bigint REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(code,user_id));
CREATE TABLE webhook_updates (bot text, update_id bigint, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(bot,update_id));
CREATE TABLE outbox (id uuid PRIMARY KEY, bot text NOT NULL DEFAULT 'user', recipient bigint NOT NULL, payload jsonb NOT NULL, attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz);
CREATE TABLE storage_gc (object_key text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX profiles_discovery ON profiles(moderation,gender);
CREATE INDEX reactions_target ON reactions(target,kind);
CREATE INDEX outbox_pending ON outbox(available_at) WHERE delivered_at IS NULL;
-- Public Supabase clients must never access the dating schema. Backend uses its DB role.
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='veyra' LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 END LOOP;
END $$;
