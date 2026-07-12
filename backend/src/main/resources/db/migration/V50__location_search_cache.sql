-- Cached Google Places gym-search responses (docs/locations-plan.md, Phase 2).
--
-- Keyed by normalized query text plus the caller's coordinates rounded to
-- ~1 km, so nearby users searching the same thing share one paid Places
-- call. Rows are only written on a cache miss (a paid call), so counting
-- rows created this month backs the global spend guard — the same design
-- nutrition_cache uses for Sonar spend.
--
-- Rows older than 30 days are treated as expired and rewritten on next
-- lookup (LocationSearchService): Google's terms cap caching of Places
-- response fields at 30 days. Place IDs alone are exempt and persist in the
-- location table.

CREATE TABLE IF NOT EXISTS location_search_cache (
    cache_id    UUID PRIMARY KEY,
    cache_key   VARCHAR(600) NOT NULL,
    results     TEXT NOT NULL,
    hit_count   INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMP(6) NOT NULL,
    last_hit_at TIMESTAMP(6),

    CONSTRAINT uq_location_search_cache_key UNIQUE (cache_key)
);

-- Backs the monthly spend-guard count.
CREATE INDEX IF NOT EXISTS idx_location_search_cache_created
    ON location_search_cache (created_at);
