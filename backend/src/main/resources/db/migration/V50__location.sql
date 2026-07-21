-- Gym/location tagging for workout posts (docs/locations-plan.md, Phase 1).
--
-- location: one row per distinct gym, shared across users. Rows sourced
-- from the Places API (Phase 2) are deduped by google_place_id; manual
-- entries have a NULL place id and are deduped by name at submit time.
-- Coordinates are the venue's public position, never a user's GPS fix.
--
-- workout.location_id: the tag lives on workout, not post — the workout is
-- where it happened; the post is just its social wrapper.

CREATE TABLE IF NOT EXISTS location (
    location_id      UUID PRIMARY KEY,
    name             VARCHAR(255) NOT NULL,
    address          VARCHAR(500),
    latitude         NUMERIC(10,7),
    longitude        NUMERIC(10,7),
    google_place_id  VARCHAR(255),
    created_by       UUID,
    created_at       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_location_google_place_id UNIQUE (google_place_id),

    -- SET NULL, not CASCADE: locations are shared rows, so deleting the user
    -- who first added a gym must not remove it from other users' workouts.
    -- AccountPurger deletes app_user directly and relies on FK actions.
    CONSTRAINT fk_location_created_by
        FOREIGN KEY (created_by)
        REFERENCES app_user(user_id)
        ON DELETE SET NULL
);

ALTER TABLE workout ADD COLUMN IF NOT EXISTS location_id UUID;

ALTER TABLE workout
    ADD CONSTRAINT fk_workout_location
        FOREIGN KEY (location_id)
        REFERENCES location(location_id)
        ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workout_location ON workout (location_id);

-- Local-DB gym search: Phase 2's picker falls back to this when the Places
-- API is capped or unconfigured. pg_trgm extension created in V17.
CREATE INDEX IF NOT EXISTS idx_location_name_trgm
    ON location USING gin (LOWER(name) gin_trgm_ops);
