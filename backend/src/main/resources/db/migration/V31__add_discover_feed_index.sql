-- Speeds up the Discover feed: PUBLIC, visible posts ordered by recency.
-- The predicate matches what JPA emits for findDiscoverPosts (the @SQLRestriction
-- on Post appends hidden_at IS NULL AND moderation_status = 'VISIBLE' to every query).
CREATE INDEX idx_post_public_created
    ON post (created_at DESC)
    WHERE visibility = 'PUBLIC'
      AND hidden_at IS NULL
      AND moderation_status = 'VISIBLE';
