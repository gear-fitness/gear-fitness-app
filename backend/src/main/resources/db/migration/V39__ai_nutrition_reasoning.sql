-- AI nutrition: memoize Sonar's reasoning + confidence alongside the parsed
-- foods so a cache hit can replay the full "Amy's thought process" panel
-- (reasoning paragraph + confidence ring) without another paid Sonar call.
--
-- reasoning: short free-text explanation of where the numbers came from.
-- confidence: 0-100 integer; 0 for rows parsed before Sonar returned one.

ALTER TABLE nutrition_cache
    ADD COLUMN IF NOT EXISTS reasoning  TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS confidence INTEGER NOT NULL DEFAULT 0;
