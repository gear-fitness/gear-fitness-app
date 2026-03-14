-- V2__custom_exercises.sql
ALTER TABLE exercise
    ADD COLUMN user_id UUID,
    ADD CONSTRAINT fk_exercise_user
        FOREIGN KEY (user_id) REFERENCES app_user(user_id);
