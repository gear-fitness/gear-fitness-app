-- V17__index_user_search.sql
-- Indexes supporting the ranked user search used by the social tab.
--
-- 1. idx_follow_follower_status covers the "does the current user follow them"
--    direction of the search join. The existing follow PK is
--    (followee_id, follower_id) and already covers the inverse direction.
--
-- 2. The trigram GIN indexes accelerate the case-insensitive substring match
--    on username and display_name. Without them, every keystroke produces a
--    sequential scan of app_user because LIKE '%query%' cannot use a regular
--    btree index.

CREATE INDEX IF NOT EXISTS idx_follow_follower_status
    ON follow (follower_id, followee_id, status);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_app_user_username_trgm
    ON app_user USING gin (LOWER(username) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_app_user_display_name_trgm
    ON app_user USING gin (LOWER(display_name) gin_trgm_ops);
