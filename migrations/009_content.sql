CREATE TABLE content_items (
 id uuid PRIMARY KEY,title text NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),kind text NOT NULL CHECK(kind IN ('today','faq')),
 activity text CHECK(activity IN ('coffee','walk','dinner','cinema','ride','party','meet')),
 city text NOT NULL DEFAULT '',active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE content_interests (
 user_id bigint REFERENCES users(id),content_id uuid REFERENCES content_items(id) ON DELETE CASCADE,
 day date NOT NULL DEFAULT CURRENT_DATE,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,content_id,day)
);
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_interests ENABLE ROW LEVEL SECURITY;
CREATE INDEX content_public ON content_items(kind,city) WHERE active;
INSERT INTO content_items(id,title,body,kind,activity) VALUES
 ('cfff1200-0000-4000-8000-000000000001','Кофе без спешки','Выберите вместе уютное кафе в людном месте. Один кофе и хороший разговор — достаточно для первой встречи.','today','coffee'),
 ('cfff1200-0000-4000-8000-000000000002','Прогулка и новый маршрут','Парк, набережная или знакомый район с неожиданной стороны. Договоритесь о месте встречи лично в чате.','today','walk'),
 ('cfff1200-0000-4000-8000-000000000003','Кино и впечатления','Выберите фильм, который интересен обоим, и оставьте время обсудить его после сеанса.','today','cinema');
