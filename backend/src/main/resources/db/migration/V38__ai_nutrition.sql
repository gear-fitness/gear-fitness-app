-- AI-powered natural-language food logging (ULTRA tier).
--
-- Two changes:
--   1. Track where a logged entry's macros came from. Existing manual/quick-add
--      entries have a NULL source_type; AI entries record 'AI_SONAR' (freshly
--      parsed by Perplexity Sonar) or 'AI_CACHE' (replayed from a prior parse)
--      plus the primary citation URL Sonar returned.
--   2. nutrition_cache: memoizes Sonar parse results keyed by the normalized
--      user text so repeated phrases ("2 scrambled eggs") don't re-hit the paid
--      API. Stores the already-parsed food array so a hit can replay logging
--      without another round-trip. Row count per month also backs the spend guard.
--      parsed_result and source_urls hold JSON strings (serialized app-side)
--      since the cache is opaque storage keyed only by normalized_key.

ALTER TABLE food_log_entry
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(32),
    ADD COLUMN IF NOT EXISTS source_url  TEXT;

CREATE TABLE nutrition_cache (
    cache_id       UUID PRIMARY KEY,
    normalized_key VARCHAR(512) NOT NULL UNIQUE,
    parsed_result  TEXT NOT NULL,
    source_urls    TEXT NOT NULL DEFAULT '[]',
    hit_count      INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMP(6) NOT NULL,
    last_hit_at    TIMESTAMP(6)
);

CREATE INDEX idx_nutrition_cache_key ON nutrition_cache (normalized_key);
