-- V33__index_workout_cardio_workout_id.sql
-- workout_id is the foreign key and the sole query predicate for cardio
-- (entries are always loaded by their owning workout), but it was unindexed.
-- Add the index so cardio lookups and cascade deletes avoid a sequential scan.
CREATE INDEX idx_workout_cardio_workout_id ON workout_cardio(workout_id);
