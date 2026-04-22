-- Add persisted streak fields to app_user
ALTER TABLE app_user
ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN last_streak_date DATE;

-- Rest day log
CREATE TABLE rest_day (
    rest_day_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT uq_rest_day_user_date UNIQUE (user_id, date)
);

CREATE INDEX idx_rest_day_user_date ON rest_day(user_id, date);

-- Streak restore usage log
CREATE TABLE streak_restore (
    streak_restore_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    used_at TIMESTAMP(6) NOT NULL DEFAULT now(),
    restored_date DATE NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT now()
);

CREATE INDEX idx_streak_restore_user_used_at ON streak_restore(user_id, used_at);
