-- Step 1: add visibility column nullable first so the table stays writable during migration
ALTER TABLE post ADD COLUMN IF NOT EXISTS visibility VARCHAR(20);

-- Step 2: mark all existing published posts as PUBLIC
UPDATE post SET visibility = 'PUBLIC' WHERE visibility IS NULL;

-- Step 3: backfill saved workouts that have no post record as PRIVATE posts
INSERT INTO post (post_id, user_id, workout_id, caption, image_url, created_at, visibility)
SELECT
    gen_random_uuid(),
    w.user_id,
    w.workout_id,
    NULL,
    NULL,
    w.created_at,
    'PRIVATE'
FROM workout w
WHERE NOT EXISTS (SELECT 1 FROM post p WHERE p.workout_id = w.workout_id);

-- Step 4: enforce NOT NULL and a hard-coded default going forward
ALTER TABLE post ALTER COLUMN visibility SET NOT NULL;
ALTER TABLE post ALTER COLUMN visibility SET DEFAULT 'PUBLIC';
ALTER TABLE post ADD CONSTRAINT post_visibility_check
    CHECK (visibility IN ('PUBLIC', 'FRIENDS', 'PRIVATE'));

-- Index to speed up per-user post listings filtered by visibility
CREATE INDEX IF NOT EXISTS idx_post_user_visibility_created
    ON post (user_id, visibility, created_at DESC);

-- Partial index for fast block lookups in feed / search queries
CREATE INDEX IF NOT EXISTS idx_follow_blocked
    ON follow (follower_id, followee_id) WHERE status = 'BLOCKED';
