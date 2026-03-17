CREATE TABLE routine (
    routine_id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(user_id),
    name VARCHAR(255) NOT NULL,
    source_workout_id UUID NOT NULL REFERENCES workout(workout_id) ON DELETE SET NULL,
    created_at TIMESTAMP(6) NOT NULL
);

CREATE TABLE routine_exercise (
    routine_exercise_id UUID PRIMARY KEY,
    routine_id UUID NOT NULL REFERENCES routine(routine_id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercise(exercise_id),
    position INTEGER NOT NULL
);

CREATE TABLE routine_scheduled_days (
    routine_id UUID NOT NULL REFERENCES routine(routine_id) ON DELETE CASCADE,
    scheduled_day VARCHAR(255) NOT NULL,
    CONSTRAINT routine_scheduled_days_scheduled_day_check CHECK (scheduled_day IN ('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'))
);
    