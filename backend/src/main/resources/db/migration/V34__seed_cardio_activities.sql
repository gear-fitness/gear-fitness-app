-- V34__seed_cardio_activities.sql
-- Seed the global cardio activity catalog (Run, Walk, Bike, ...) that the app's
-- cardio picker reads via GET /api/cardio-activities.
--
-- Why this is a versioned migration and not left to the seed file:
-- V32 creates the cardio_activity table EMPTY, and the catalog rows live only in
-- db/seed/R__seed_data.sql. The seed is excluded from production
-- (application-prod.properties sets spring.flyway.locations=classpath:db/migration
-- only) and cannot run against a populated database. Without this migration the
-- cardio_activity table stays empty in prod, the picker shows "No cardio
-- activities", and users cannot log cardio at all. Catalog/reference data the
-- app depends on belongs in a versioned migration so it ships to every
-- environment, exactly like the rest of our schema.
--
-- Safe on a live production database (100+ real users): additive only, no
-- TRUNCATE/DELETE/UPDATE, and ON CONFLICT DO NOTHING so it cannot fail or
-- duplicate if any of these rows already exist. UUIDs match R__seed_data.sql so
-- the dev-seeded and production catalogs are identical.
INSERT INTO cardio_activity (cardio_activity_id, name, description)
VALUES
    ('750e8400-e29b-41d4-a716-556655440001', 'Run', 'Outdoor or track running'),
    ('750e8400-e29b-41d4-a716-556655440002', 'Walk', 'Casual or brisk walking'),
    ('750e8400-e29b-41d4-a716-556655440003', 'Bike', 'Outdoor cycling'),
    ('750e8400-e29b-41d4-a716-556655440004', 'Treadmill', 'Indoor treadmill running or walking'),
    ('750e8400-e29b-41d4-a716-556655440005', 'Elliptical', 'Low impact elliptical machine'),
    ('750e8400-e29b-41d4-a716-556655440006', 'Rowing Machine', 'Full body rowing cardio'),
    ('750e8400-e29b-41d4-a716-556655440007', 'Stair Master', 'Stair climbing machine'),
    ('750e8400-e29b-41d4-a716-556655440008', 'Swim', 'Pool or open water swimming'),
    ('750e8400-e29b-41d4-a716-556655440009', 'Jump Rope', 'Skipping rope cardio')
ON CONFLICT (cardio_activity_id) DO NOTHING;
