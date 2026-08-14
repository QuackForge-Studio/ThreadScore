CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by TEXT,
  error_message TEXT,
  thread_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_url ON requests(url);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);

CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  content TEXT,
  author_username TEXT,
  author_name TEXT,
  posted_at INTEGER,
  total_comments INTEGER NOT NULL DEFAULT 0,
  scoring_status TEXT NOT NULL DEFAULT 'pending_scoring',
  avg_anger_score REAL,
  score_breakdown TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_threads_scoring ON threads(scoring_status);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  external_id TEXT,
  author_username TEXT,
  author_name TEXT,
  text TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  posted_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_thread ON comments(thread_id);

CREATE TABLE IF NOT EXISTS ai_scores (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  score REAL NOT NULL,
  label TEXT NOT NULL,
  reason TEXT,
  model TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scores_comment ON ai_scores(comment_id);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  user_id TEXT,
  vote TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_votes_comment ON votes(comment_id);

CREATE TABLE IF NOT EXISTS user_comments (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT,
  display_name TEXT,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_comments_thread ON user_comments(thread_id);

CREATE TABLE IF NOT EXISTS locks (
  name TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
