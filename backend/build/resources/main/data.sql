CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO app_user (user_id, username, email, password_hash, is_private, created_at)
VALUES (gen_random_uuid(), 'bryant', 'bryant@example.com', 'hashed123', false, NOW());

INSERT INTO exercise (exercise_id, name, body_part, description)
VALUES (gen_random_uuid(), 'Bench Press', 'CHEST', 'Push exercise for chest.');
