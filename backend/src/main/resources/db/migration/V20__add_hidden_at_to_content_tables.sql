ALTER TABLE post ADD COLUMN hidden_at TIMESTAMP NULL;
ALTER TABLE post_comment ADD COLUMN hidden_at TIMESTAMP NULL;
ALTER TABLE post_like ADD COLUMN hidden_at TIMESTAMP NULL;
ALTER TABLE follow ADD COLUMN hidden_at TIMESTAMP NULL;

CREATE INDEX idx_post_user_hidden ON post(user_id, hidden_at);
CREATE INDEX idx_post_comment_user_hidden ON post_comment(user_id, hidden_at);
CREATE INDEX idx_post_like_user_hidden ON post_like(user_id, hidden_at);
CREATE INDEX idx_follow_follower_hidden ON follow(follower_id, hidden_at);
CREATE INDEX idx_follow_followee_hidden ON follow(followee_id, hidden_at);