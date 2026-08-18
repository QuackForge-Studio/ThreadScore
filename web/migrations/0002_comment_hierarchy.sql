ALTER TABLE comments ADD COLUMN parent_id TEXT;
ALTER TABLE comments ADD COLUMN reply_to_username TEXT;
ALTER TABLE threads ADD COLUMN main_post_id TEXT;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(thread_id, parent_id);
