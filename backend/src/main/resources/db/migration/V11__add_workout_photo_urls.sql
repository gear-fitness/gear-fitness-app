CREATE TABLE IF NOT EXISTS workout_photo_url (
    workout_id UUID NOT NULL REFERENCES workout(workout_id) ON DELETE CASCADE,
    position INT NOT NULL,
    photo_url VARCHAR(1024) NOT NULL,
    PRIMARY KEY (workout_id, position)
);
