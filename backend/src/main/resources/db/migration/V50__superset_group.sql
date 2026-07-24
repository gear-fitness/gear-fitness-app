-- Exercises sharing a superset_group value form a superset; members are kept
-- adjacent in position. Nullable forever so pre-superset clients and rolled
-- back jars keep working; null means ungrouped.
ALTER TABLE workout_exercise ADD COLUMN superset_group INTEGER;

ALTER TABLE routine_exercise ADD COLUMN superset_group INTEGER;
