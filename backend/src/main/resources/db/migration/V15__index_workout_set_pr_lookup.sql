-- V15__index_workout_set_pr_lookup.sql
-- Index to support per-(user, exercise) PR recomputation.
-- The recompute walks every set for a (user, exercise) pair in chronological
-- order; this index narrows the join from workout -> workout_exercise
-- -> workout_set and lets the query skip null-weight sets cheaply.

CREATE INDEX IF NOT EXISTS idx_workout_set_we_weight
    ON workout_set (workout_exercise_id, weight_lbs DESC)
    WHERE weight_lbs IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_exercise_exercise_id
    ON workout_exercise (exercise_id);

CREATE INDEX IF NOT EXISTS idx_workout_user_date
    ON workout (user_id, date_performed);
