-- V32__create_cardio_tables.sql
-- Cardio logging: catalog of cardio activities + per-workout cardio entries.
-- workout_cardio sits alongside workout_exercise under the same workout_id, so
-- cardio and lifting share one workout and one social post.

-- Cardio activity catalog (global, no owning user — mirrors exercise catalog).
CREATE TABLE cardio_activity (
    cardio_activity_id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- Per-workout cardio entries. activity_type denormalizes the catalog name so a
-- logged entry is self-describing without a join.
CREATE TABLE workout_cardio (
    workout_cardio_id UUID PRIMARY KEY,
    workout_id UUID NOT NULL,
    activity_type VARCHAR(255) NOT NULL,
    duration_seconds INTEGER NOT NULL,
    distance_meters DECIMAL(10,2),
    calories_burned INTEGER,
    intensity_level DECIMAL(4,1),
    notes TEXT,
    position INTEGER NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_workout_cardio_workout FOREIGN KEY (workout_id) REFERENCES workout(workout_id)
);
