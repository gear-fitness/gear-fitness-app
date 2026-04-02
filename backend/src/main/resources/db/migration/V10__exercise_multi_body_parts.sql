-- V3__exercise_multi_body_parts.sql
-- Migrate from single body_part column on exercise to a many-to-many join table
-- supporting PRIMARY, and SECONDARY

-- 1. Create the join table
CREATE TABLE exercise_body_part (
    exercise_id UUID NOT NULL,
    body_part   VARCHAR(255) NOT NULL,
    target_type VARCHAR(255) NOT NULL,

    PRIMARY KEY (exercise_id, body_part),

    CONSTRAINT fk_exercise_body_part_exercise
        FOREIGN KEY (exercise_id) REFERENCES exercise(exercise_id)
        ON DELETE CASCADE,

    CONSTRAINT exercise_body_part_body_part_check
        CHECK (body_part IN (
            'CHEST','BACK','SHOULDERS','BICEPS','TRICEPS',
            'LEGS','QUADS','HAMSTRINGS','GLUTES','CALVES',
            'CORE','TRAPS','FOREARMS','FULL_BODY','OTHER'
        )),

    CONSTRAINT exercise_body_part_target_type_check
        CHECK (target_type IN ('PRIMARY','SECONDARY'))
);

CREATE INDEX idx_exercise_body_part_exercise_id ON exercise_body_part(exercise_id);
CREATE INDEX idx_exercise_body_part_body_part   ON exercise_body_part(body_part);

-- 2. Migrate existing data — every current body_part becomes PRIMARY
INSERT INTO exercise_body_part (exercise_id, body_part, target_type)
SELECT exercise_id, body_part, 'PRIMARY'
FROM exercise;

-- 3. Drop the old column and its check constraint
ALTER TABLE exercise DROP COLUMN body_part;