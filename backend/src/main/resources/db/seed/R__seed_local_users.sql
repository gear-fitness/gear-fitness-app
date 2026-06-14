-- =====================================================================
-- LOCAL-ONLY bulk user seed (for exercising the social search ranking).
--
-- This lives in db/seed, which is loaded ONLY under the default (local/dev)
-- profile. The `prod` profile excludes it entirely:
--   application-prod.properties -> spring.flyway.locations=classpath:db/migration
-- so this script never runs against production.
--
-- It is a Flyway *repeatable* migration: re-applied on startup whenever its
-- checksum changes, and run once on a fresh database. By alphabetical
-- description order it runs AFTER R__seed_data.sql, so that file's
-- `TRUNCATE ... app_user, follow CASCADE` has already executed and these rows
-- are purely additive. Every insert is ON CONFLICT DO NOTHING so a standalone
-- re-run can never error.
--
-- Anchor user (from R__seed_data.sql) we wire relationships to:
--   bryant = 550e8400-e29b-41d4-a716-446655440001
-- All seeded users share the same bcrypt password hash as the demo users.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 200 generated users. First/last names are picked from small arrays by
-- the series index, with deliberate near-duplicates (John/Jon/Johnny,
-- Chris/Christopher, Brian/Bryan, Alex/Alexandra, Sam/Samuel) so partial
-- and fuzzy searches have realistic competition. Display names contain a
-- space to exercise word-boundary matching; usernames are lowercase
-- alphanumeric to satisfy the app's username rules.
-- ---------------------------------------------------------------------
INSERT INTO app_user (
  user_id, username, display_name, email, password_hash,
  is_private, age, height_inches, weight_lbs, created_at
)
SELECT
  ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
  lower(fn) || lower(ln) || g,                       -- e.g. johnsmith42 (unique via g)
  fn || ' ' || ln,                                   -- e.g. "John Smith"
  lower(fn) || lower(ln) || g || '@example.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  (g % 5 = 0),                                       -- ~20% private accounts
  20 + (g % 25),
  62 + (g % 16),
  130 + (g % 90),
  NOW() - (g || ' days')::interval
FROM (
  SELECT
    g,
    (ARRAY['James','John','Jon','Johnny','Robert','Michael','Maria','Sarah',
           'David','Daniel','Chris','Christopher','Kobe','Kevin','Brian',
           'Bryan','Alex','Alexandra','Sam','Samuel'])[1 + (g % 20)]        AS fn,
    (ARRAY['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller',
           'Davis','Bryant','Anderson','Thomas','Martinez','Robinson',
           'Clark','Lewis','Walker','Young','King','Wright','Hill'])[1 + ((g / 7) % 20)] AS ln
  FROM generate_series(1, 200) AS g
) names
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- Themed "kobe" cluster: makes the new ranking easy to validate by hand.
-- Searching "kobe" should surface exact/prefix username & display-name
-- matches above mere substring hits; "kobi" should fuzzy-match via pg_trgm.
-- ---------------------------------------------------------------------
INSERT INTO app_user (
  user_id, username, display_name, email, password_hash,
  is_private, age, height_inches, weight_lbs, created_at
)
VALUES
  ('00000000-0000-4000-8000-000000000901'::uuid, 'kobebryant', 'Kobe Bryant',    'kobebryant@example.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', false, 28, 78, 212, NOW() - INTERVAL '60 days'),
  ('00000000-0000-4000-8000-000000000902'::uuid, 'kobe_mamba', 'Kobe Mamba',     'kobe_mamba@example.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', false, 31, 75, 205, NOW() - INTERVAL '55 days'),
  ('00000000-0000-4000-8000-000000000903'::uuid, 'kobester',   'Kobe Tester',    'kobester@example.com',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', false, 22, 70, 165, NOW() - INTERVAL '50 days'),
  ('00000000-0000-4000-8000-000000000904'::uuid, 'jakobe',     'Jakob Eriksson', 'jakobe@example.com',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', false, 27, 71, 178, NOW() - INTERVAL '45 days'),
  ('00000000-0000-4000-8000-000000000905'::uuid, 'mariakobe',  'Maria Kobe',     'mariakobe@example.com',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', true,  26, 65, 140, NOW() - INTERVAL '40 days'),
  ('00000000-0000-4000-8000-000000000906'::uuid, 'kobi_typo',  'Kobi Mistype',   'kobi_typo@example.com',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', false, 24, 69, 170, NOW() - INTERVAL '35 days'),
  ('00000000-0000-4000-8000-000000000907'::uuid, 'kobeyoung',  'Kobe Young',     'kobeyoung@example.com',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', false, 23, 74, 188, NOW() - INTERVAL '30 days')
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- Relationships to the bryant anchor so the relationship-boost tie-breaker
-- is observable: bryant follows every 3rd generated user; every 4th
-- generated user follows bryant back. (follower_id, followee_id) is the PK.
-- ---------------------------------------------------------------------
INSERT INTO follow (follower_id, followee_id, status, created_at, responded_at)
SELECT
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
  'ACCEPTED', NOW(), NOW()
FROM generate_series(1, 200, 3) AS g
ON CONFLICT DO NOTHING;

INSERT INTO follow (follower_id, followee_id, status, created_at, responded_at)
SELECT
  ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'ACCEPTED', NOW(), NOW()
FROM generate_series(2, 200, 4) AS g
ON CONFLICT DO NOTHING;
