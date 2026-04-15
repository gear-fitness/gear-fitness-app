-- V11__sync_body_tag_constraint.sql
-- Add TRAPS and FOREARMS to workout_body_tags CHECK constraint
-- to match the full set of muscle groups used in exercise_body_part.

ALTER TABLE workout_body_tags
    DROP CONSTRAINT workout_body_tags_body_tag_check;

ALTER TABLE workout_body_tags
    ADD CONSTRAINT workout_body_tags_body_tag_check
        CHECK (body_tag IN (
            'CHEST','BACK','SHOULDERS','BICEPS','TRICEPS',
            'LEGS','QUADS','HAMSTRINGS','GLUTES','CALVES',
            'CORE','TRAPS','FOREARMS','FULL_BODY','OTHER'
        ));