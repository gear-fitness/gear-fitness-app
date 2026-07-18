-- One-level comment replies: a reply points at its top-level parent comment.
-- Existing comments get parent_comment_id = NULL (top-level), preserving
-- current behavior. Additive only — no rewrite of existing rows.
ALTER TABLE post_comment ADD COLUMN IF NOT EXISTS parent_comment_id UUID;

ALTER TABLE post_comment ADD CONSTRAINT fk_post_comment_parent
    FOREIGN KEY (parent_comment_id)
    REFERENCES post_comment(comment_id);

CREATE INDEX IF NOT EXISTS idx_post_comment_parent
    ON post_comment (parent_comment_id);
