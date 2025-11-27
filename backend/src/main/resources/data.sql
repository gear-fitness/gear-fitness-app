-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Clear existing data (optional - comment out if you want to keep existing data)
TRUNCATE TABLE workout_set, workout_exercise, post_comment, post_like, post, workout, exercise, follow, app_user CASCADE;

-- Insert Users
INSERT INTO app_user (user_id, username, email, password_hash, is_private, age, height_inches, weight_lbs, created_at)
VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'bryant', 'bryant@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', false, 25, 72, 180, NOW() - INTERVAL '120 days'),
    ('550e8400-e29b-41d4-a716-446655440002', 'max', 'max@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', false, 28, 70, 190, NOW() - INTERVAL '100 days'),
    ('550e8400-e29b-41d4-a716-446655440003', 'kobe', 'kobe@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', true, 24, 73, 195, NOW() - INTERVAL '90 days'),
    ('550e8400-e29b-41d4-a716-446655440004', 'alton', 'alton@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', false, 30, 68, 175, NOW() - INTERVAL '80 days');

-- Insert Exercises
INSERT INTO exercise (exercise_id, name, body_part, description)
VALUES 
    ('650e8400-e29b-41d4-a716-446655440001', 'Bench Press', 'CHEST', 'Compound push exercise targeting chest, shoulders, and triceps.'),
    ('650e8400-e29b-41d4-a716-446655440002', 'Squat', 'LEGS', 'Compound lower body exercise targeting quads, glutes, and hamstrings.'),
    ('650e8400-e29b-41d4-a716-446655440003', 'Deadlift', 'BACK', 'Full body compound exercise primarily targeting back and legs.'),
    ('650e8400-e29b-41d4-a716-446655440004', 'Overhead Press', 'SHOULDERS', 'Vertical pressing movement for shoulders and triceps.'),
    ('650e8400-e29b-41d4-a716-446655440005', 'Barbell Row', 'BACK', 'Horizontal pulling exercise for back thickness.'),
    ('650e8400-e29b-41d4-a716-446655440006', 'Pull Up', 'BACK', 'Vertical pulling exercise for back width and biceps.'),
    ('650e8400-e29b-41d4-a716-446655440007', 'Dumbbell Curl', 'BICEPS', 'Isolation exercise for biceps.'),
    ('650e8400-e29b-41d4-a716-446655440008', 'Tricep Dips', 'TRICEPS', 'Compound pushing exercise for triceps.'),
    ('650e8400-e29b-41d4-a716-446655440009', 'Leg Press', 'LEGS', 'Machine exercise for quads and glutes.'),
    ('650e8400-e29b-41d4-a716-446655440010', 'Lat Pulldown', 'BACK', 'Machine exercise for lat development.'),
    ('650e8400-e29b-41d4-a716-446655440011', 'Leg Curl', 'HAMSTRINGS', 'Isolation exercise for hamstrings.'),
    ('650e8400-e29b-41d4-a716-446655440012', 'Calf Raise', 'CALVES', 'Isolation exercise for calves.'),
    ('650e8400-e29b-41d4-a716-446655440013', 'Plank', 'CORE', 'Isometric core stability exercise.'),
    ('650e8400-e29b-41d4-a716-446655440014', 'Incline Bench Press', 'CHEST', 'Upper chest focused pressing movement.'),
    ('650e8400-e29b-41d4-a716-446655440015', 'Romanian Deadlift', 'HAMSTRINGS', 'Hip hinge movement targeting hamstrings and glutes.');

-- Insert Workouts for Bryant
INSERT INTO workout (workout_id, name, date_performed, duration_min, body_tag, created_at, user_id)
VALUES 
    ('750e8400-e29b-41d4-a716-446655440001', 'Chest Day', CURRENT_DATE - INTERVAL '2 days', 75, 'CHEST', NOW() - INTERVAL '2 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440002', 'Leg Day', CURRENT_DATE - INTERVAL '5 days', 90, 'LEGS', NOW() - INTERVAL '5 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440003', 'Back Day', CURRENT_DATE - INTERVAL '7 days', 80, 'BACK', NOW() - INTERVAL '7 days', '550e8400-e29b-41d4-a716-446655440001');

-- Insert Workouts for Max
INSERT INTO workout (workout_id, name, date_performed, duration_min, body_tag, created_at, user_id)
VALUES 
    ('750e8400-e29b-41d4-a716-446655440004', 'Upper Body Power', CURRENT_DATE - INTERVAL '1 day', 60, 'CHEST', NOW() - INTERVAL '1 day', '550e8400-e29b-41d4-a716-446655440002'),
    ('750e8400-e29b-41d4-a716-446655440005', 'Lower Body Power', CURRENT_DATE - INTERVAL '3 days', 70, 'LEGS', NOW() - INTERVAL '3 days', '550e8400-e29b-41d4-a716-446655440002');

-- Insert Workouts for Kobe
INSERT INTO workout (workout_id, name, date_performed, duration_min, body_tag, created_at, user_id)
VALUES 
    ('750e8400-e29b-41d4-a716-446655440006', 'Full Body Strength', CURRENT_DATE, 85, 'FULL_BODY', NOW(), '550e8400-e29b-41d4-a716-446655440003'),
    ('750e8400-e29b-41d4-a716-446655440007', 'Shoulders & Arms', CURRENT_DATE - INTERVAL '4 days', 55, 'SHOULDERS', NOW() - INTERVAL '4 days', '550e8400-e29b-41d4-a716-446655440003');

-- Insert Workouts for Alton
INSERT INTO workout (workout_id, name, date_performed, duration_min, body_tag, created_at, user_id)
VALUES 
    ('750e8400-e29b-41d4-a716-446655440008', 'Push Day', CURRENT_DATE - INTERVAL '1 day', 65, 'CHEST', NOW() - INTERVAL '1 day', '550e8400-e29b-41d4-a716-446655440004'),
    ('750e8400-e29b-41d4-a716-446655440009', 'Pull Day', CURRENT_DATE - INTERVAL '3 days', 70, 'BACK', NOW() - INTERVAL '3 days', '550e8400-e29b-41d4-a716-446655440004'),
    ('750e8400-e29b-41d4-a716-446655440010', 'Leg Day', CURRENT_DATE - INTERVAL '6 days', 95, 'LEGS', NOW() - INTERVAL '6 days', '550e8400-e29b-41d4-a716-446655440004');

-- Insert Workout Exercises for Bryant's Chest Day
INSERT INTO workout_exercise (workout_exercise_id, workout_id, exercise_id, position, note)
VALUES 
    ('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 1, 'Focus on controlled tempo'),
    ('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440014', 2, 'Upper chest activation'),
    ('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440008', 3, 'Bodyweight to failure');

-- Insert Workout Exercises for Bryant's Leg Day
INSERT INTO workout_exercise (workout_exercise_id, workout_id, exercise_id, position, note)
VALUES 
    ('850e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 1, 'ATG squats'),
    ('850e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440009', 2, NULL),
    ('850e8400-e29b-41d4-a716-446655440006', '750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440011', 3, NULL),
    ('850e8400-e29b-41d4-a716-446655440007', '750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440012', 4, 'High volume');

-- Insert Workout Exercises for Bryant's Back Day
INSERT INTO workout_exercise (workout_exercise_id, workout_id, exercise_id, position, note)
VALUES 
    ('850e8400-e29b-41d4-a716-446655440008', '750e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', 1, 'Conventional stance'),
    ('850e8400-e29b-41d4-a716-446655440009', '750e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440005', 2, NULL),
    ('850e8400-e29b-41d4-a716-446655440010', '750e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440006', 3, 'Wide grip');

-- Insert Workout Exercises for Max's Upper Body
INSERT INTO workout_exercise (workout_exercise_id, workout_id, exercise_id, position, note)
VALUES 
    ('850e8400-e29b-41d4-a716-446655440011', '750e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440001', 1, 'Explosive press'),
    ('850e8400-e29b-41d4-a716-446655440012', '750e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440004', 2, NULL),
    ('850e8400-e29b-41d4-a716-446655440013', '750e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440007', 3, NULL);

-- Insert Workout Exercises for Max's Lower Body
INSERT INTO workout_exercise (workout_exercise_id, workout_id, exercise_id, position, note)
VALUES 
    ('850e8400-e29b-41d4-a716-446655440014', '750e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440002', 1, 'Heavy singles'),
    ('850e8400-e29b-41d4-a716-446655440015', '750e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440015', 2, NULL);

-- Insert Workout Exercises for Kobe's Full Body
INSERT INTO workout_exercise (workout_exercise_id, workout_id, exercise_id, position, note)
VALUES 
    ('850e8400-e29b-41d4-a716-446655440016', '750e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440003', 1, 'New PR attempt!'),
    ('850e8400-e29b-41d4-a716-446655440017', '750e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440001', 2, NULL),
    ('850e8400-e29b-41d4-a716-446655440018', '750e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440006', 3, NULL),
    ('850e8400-e29b-41d4-a716-446655440019', '750e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440013', 4, '3 min hold');

-- Insert Workout Exercises for Kobe's Shoulders & Arms
INSERT INTO workout_exercise (workout_exercise_id, workout_id, exercise_id, position, note)
VALUES 
    ('850e8400-e29b-41d4-a716-446655440020', '750e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440004', 1, NULL),
    ('850e8400-e29b-41d4-a716-446655440021', '750e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440007', 2, 'Superset with triceps'),
    ('850e8400-e29b-41d4-a716-446655440022', '750e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440008', 3, NULL);

-- Insert Workout Exercises for Alton's Push Day
INSERT INTO workout_exercise (workout_exercise_id, workout_id, exercise_id, position, note)
VALUES 
    ('850e8400-e29b-41d4-a716-446655440023', '750e8400-e29b-41d4-a716-446655440008', '650e8400-e29b-41d4-a716-446655440001', 1, NULL),
    ('850e8400-e29b-41d4-a716-446655440024', '750e8400-e29b-41d4-a716-446655440008', '650e8400-e29b-41d4-a716-446655440004', 2, NULL),
    ('850e8400-e29b-41d4-a716-446655440025', '750e8400-e29b-41d4-a716-446655440008', '650e8400-e29b-41d4-a716-446655440008', 3, NULL);

-- Insert Workout Exercises for Alton's Pull Day
INSERT INTO workout_exercise (workout_exercise_id, workout_id, exercise_id, position, note)
VALUES 
    ('850e8400-e29b-41d4-a716-446655440026', '750e8400-e29b-41d4-a716-446655440009', '650e8400-e29b-41d4-a716-446655440003', 1, 'Sumo stance'),
    ('850e8400-e29b-41d4-a716-446655440027', '750e8400-e29b-41d4-a716-446655440009', '650e8400-e29b-41d4-a716-446655440006', 2, NULL),
    ('850e8400-e29b-41d4-a716-446655440028', '750e8400-e29b-41d4-a716-446655440009', '650e8400-e29b-41d4-a716-446655440007', 3, NULL);

-- Insert Workout Exercises for Alton's Leg Day
INSERT INTO workout_exercise (workout_exercise_id, workout_id, exercise_id, position, note)
VALUES 
    ('850e8400-e29b-41d4-a716-446655440029', '750e8400-e29b-41d4-a716-446655440010', '650e8400-e29b-41d4-a716-446655440002', 1, 'Volume day'),
    ('850e8400-e29b-41d4-a716-446655440030', '750e8400-e29b-41d4-a716-446655440010', '650e8400-e29b-41d4-a716-446655440009', 2, NULL),
    ('850e8400-e29b-41d4-a716-446655440031', '750e8400-e29b-41d4-a716-446655440010', '650e8400-e29b-41d4-a716-446655440011', 3, NULL),
    ('850e8400-e29b-41d4-a716-446655440032', '750e8400-e29b-41d4-a716-446655440010', '650e8400-e29b-41d4-a716-446655440012', 4, NULL);

-- Insert Workout Sets for Bryant's Bench Press (100kg = 220 lbs, 105kg = 231 lbs, 110kg = 243 lbs)
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_lbs, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', 1, 8, 220, false),
    ('950e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440001', 2, 8, 220, false),
    ('950e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440001', 3, 6, 231, false),
    ('950e8400-e29b-41d4-a716-446655440004', '850e8400-e29b-41d4-a716-446655440001', 4, 5, 243, true);

-- Insert Workout Sets for Bryant's Incline Bench (80kg = 176 lbs, 85kg = 187 lbs)
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_lbs, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440005', '850e8400-e29b-41d4-a716-446655440002', 1, 10, 176, false),
    ('950e8400-e29b-41d4-a716-446655440006', '850e8400-e29b-41d4-a716-446655440002', 2, 10, 176, false),
    ('950e8400-e29b-41d4-a716-446655440007', '850e8400-e29b-41d4-a716-446655440002', 3, 8, 187, false);

-- Insert Workout Sets for Bryant's Dips (bodyweight - NULL)
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_lbs, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440008', '850e8400-e29b-41d4-a716-446655440003', 1, 12, NULL, false),
    ('950e8400-e29b-41d4-a716-446655440009', '850e8400-e29b-41d4-a716-446655440003', 2, 10, NULL, false),
    ('950e8400-e29b-41d4-a716-446655440010', '850e8400-e29b-41d4-a716-446655440003', 3, 8, NULL, false);

-- Insert Workout Sets for Bryant's Squats (140kg = 309 lbs, 150kg = 331 lbs, 160kg = 353 lbs)
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_lbs, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440011', '850e8400-e29b-41d4-a716-446655440004', 1, 5, 309, false),
    ('950e8400-e29b-41d4-a716-446655440012', '850e8400-e29b-41d4-a716-446655440004', 2, 5, 309, false),
    ('950e8400-e29b-41d4-a716-446655440013', '850e8400-e29b-41d4-a716-446655440004', 3, 5, 331, true),
    ('950e8400-e29b-41d4-a716-446655440014', '850e8400-e29b-41d4-a716-446655440004', 4, 3, 353, true);

-- Insert Workout Sets for Bryant's Leg Press (200kg = 441 lbs, 220kg = 485 lbs)
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_lbs, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440015', '850e8400-e29b-41d4-a716-446655440005', 1, 12, 441, false),
    ('950e8400-e29b-41d4-a716-446655440016', '850e8400-e29b-41d4-a716-446655440005', 2, 12, 441, false),
    ('950e8400-e29b-41d4-a716-446655440017', '850e8400-e29b-41d4-a716-446655440005', 3, 10, 485, false);

-- Insert Workout Sets for Max's Bench Press (120kg = 265 lbs, 125kg = 276 lbs, 130kg = 287 lbs)
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_lbs, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440018', '850e8400-e29b-41d4-a716-446655440011', 1, 3, 265, false),
    ('950e8400-e29b-41d4-a716-446655440019', '850e8400-e29b-41d4-a716-446655440011', 2, 3, 276, false),
    ('950e8400-e29b-41d4-a716-446655440020', '850e8400-e29b-41d4-a716-446655440011', 3, 2, 287, true);

-- Insert Workout Sets for Max's OHP (60kg = 132 lbs, 65kg = 143 lbs)
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_lbs, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440021', '850e8400-e29b-41d4-a716-446655440012', 1, 5, 132, false),
    ('950e8400-e29b-41d4-a716-446655440022', '850e8400-e29b-41d4-a716-446655440012', 2, 5, 132, false),
    ('950e8400-e29b-41d4-a716-446655440023', '850e8400-e29b-41d4-a716-446655440012', 3, 5, 143, true);

-- Insert Workout Sets for Kobe's Deadlift (180kg = 397 lbs, 190kg = 419 lbs, 200kg = 441 lbs, 210kg = 463 lbs)
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_lbs, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440024', '850e8400-e29b-41d4-a716-446655440016', 1, 5, 397, false),
    ('950e8400-e29b-41d4-a716-446655440025', '850e8400-e29b-41d4-a716-446655440016', 2, 5, 419, false),
    ('950e8400-e29b-41d4-a716-446655440026', '850e8400-e29b-41d4-a716-446655440016', 3, 3, 441, true),
    ('950e8400-e29b-41d4-a716-446655440027', '850e8400-e29b-41d4-a716-446655440016', 4, 1, 463, true);

-- Insert Workout Sets for Alton's exercises (90kg = 198 lbs, 95kg = 209 lbs, 315 lbs, 170kg = 375 lbs, 180kg = 397 lbs, 120kg = 265 lbs, 130kg = 287 lbs)
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_lbs, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440028', '850e8400-e29b-41d4-a716-446655440023', 1, 10, 198, false),
    ('950e8400-e29b-41d4-a716-446655440029', '850e8400-e29b-41d4-a716-446655440023', 2, 10, 198, false),
    ('950e8400-e29b-41d4-a716-446655440030', '850e8400-e29b-41d4-a716-446655440023', 3, 8, 209, false),
    ('950e8400-e29b-41d4-a716-446655440036', '850e8400-e29b-41d4-a716-446655440023', 4, 1, 315, true),
    ('950e8400-e29b-41d4-a716-446655440031', '850e8400-e29b-41d4-a716-446655440026', 1, 8, 375, false),
    ('950e8400-e29b-41d4-a716-446655440032', '850e8400-e29b-41d4-a716-446655440026', 2, 6, 397, false),
    ('950e8400-e29b-41d4-a716-446655440033', '850e8400-e29b-41d4-a716-446655440029', 1, 8, 265, false),
    ('950e8400-e29b-41d4-a716-446655440034', '850e8400-e29b-41d4-a716-446655440029', 2, 8, 265, false),
    ('950e8400-e29b-41d4-a716-446655440035', '850e8400-e29b-41d4-a716-446655440029', 3, 6, 287, false);

-- Insert Posts
INSERT INTO post (post_id, workout_id, image_url, caption, user_id, created_at)
VALUES 
    ('a50e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'https://example.com/images/bryant-chest.jpg', 'Hit a new PR on bench today! 💪 243 lbs for 5 reps. Feeling strong!', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '2 days'),
    ('a50e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 'https://example.com/images/bryant-legs.jpg', 'Leg day complete! Squats felt heavy but got through it. 🦵', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '5 days'),
    ('a50e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440004', 'https://example.com/images/max-upper.jpg', 'Upper body power session done! New bench PR 🔥', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '1 day'),
    ('a50e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440006', 'https://example.com/images/kobe-fullbody.jpg', '463 lbs deadlift PR! Been chasing this for months 🎯', '550e8400-e29b-41d4-a716-446655440003', NOW()),
    ('a50e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440008', 'https://example.com/images/alton-push.jpg', 'Solid push day. Chest and shoulders on fire! 🔥', '550e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '1 day'),
    ('a50e8400-e29b-41d4-a716-446655440006', '750e8400-e29b-41d4-a716-446655440010', 'https://example.com/images/alton-legs.jpg', 'Leg day destroyed me but worth it! Never skip leg day 🦵', '550e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '6 days');

-- Insert Post Likes
INSERT INTO post_like (post_id, user_id, created_at)
VALUES 
    -- Bryant's chest post likes
    ('a50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '2 days'),
    ('a50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '2 days'),
    ('a50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '1 day'),
    
    -- Bryant's leg post likes
    ('a50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '5 days'),
    ('a50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '4 days'),
    
    -- Max's upper body post likes
    ('a50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '1 day'),
    ('a50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '1 day'),
    ('a50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '20 hours'),
    
    -- Kobe's full body post likes
    ('a50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '2 hours'),
    ('a50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '1 hour'),
    ('a50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '30 minutes'),
    
    -- Alton's push post likes
    ('a50e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '1 day'),
    ('a50e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '18 hours'),
    
    -- Alton's leg post likes
    ('a50e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '6 days'),
    ('a50e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '5 days');

-- Insert Post Comments
INSERT INTO post_comment (comment_id, post_id, user_id, body, created_at)
VALUES 
    -- Comments on Bryant's chest post
    ('b50e8400-e29b-41d4-a716-446655440001', 'a50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Beast mode! 🔥', NOW() - INTERVAL '2 days'),
    ('b50e8400-e29b-41d4-a716-446655440002', 'a50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'Impressive! Keep it up bro!', NOW() - INTERVAL '2 days'),
    ('b50e8400-e29b-41d4-a716-446655440003', 'a50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'That''s crazy weight! Congrats on the PR', NOW() - INTERVAL '1 day'),
    
    -- Comments on Bryant's leg post
    ('b50e8400-e29b-41d4-a716-446655440004', 'a50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Leg day is the best day! Nice work', NOW() - INTERVAL '5 days'),
    ('b50e8400-e29b-41d4-a716-446655440005', 'a50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'Never skip leg day! 💪', NOW() - INTERVAL '4 days'),
    
    -- Comments on Max's upper body post
    ('b50e8400-e29b-41d4-a716-446655440006', 'a50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Strong work Max! What''s your program?', NOW() - INTERVAL '1 day'),
    ('b50e8400-e29b-41d4-a716-446655440007', 'a50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Thanks bro! Running a PPL split right now', NOW() - INTERVAL '1 day'),
    ('b50e8400-e29b-41d4-a716-446655440008', 'a50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'PRs on PRs! Let''s go!', NOW() - INTERVAL '1 day'),
    ('b50e8400-e29b-41d4-a716-446655440009', 'a50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '287 lbs bench is insane! Goals right there', NOW() - INTERVAL '20 hours'),
    
    -- Comments on Kobe's full body post
    ('b50e8400-e29b-41d4-a716-446655440010', 'a50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'YOOOO! 463 lbs is massive! Congrats dude!', NOW() - INTERVAL '2 hours'),
    ('b50e8400-e29b-41d4-a716-446655440011', 'a50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'That''s what I''m talking about! Inspirational 💯', NOW() - INTERVAL '1 hour'),
    ('b50e8400-e29b-41d4-a716-446655440012', 'a50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'Absolute unit! Well deserved PR man', NOW() - INTERVAL '30 minutes'),
    ('b50e8400-e29b-41d4-a716-446655440013', 'a50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'Thanks everyone! Months of grinding finally paid off!', NOW() - INTERVAL '15 minutes'),
    
    -- Comments on Alton's push post
    ('b50e8400-e29b-41d4-a716-446655440014', 'a50e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'Solid session! Keep pushing', NOW() - INTERVAL '1 day'),
    ('b50e8400-e29b-41d4-a716-446655440015', 'a50e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'Nice! How many sets did you do?', NOW() - INTERVAL '18 hours'),
    
    -- Comments on Alton's leg post
    ('b50e8400-e29b-41d4-a716-446655440016', 'a50e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', 'Respect! Leg day is brutal', NOW() - INTERVAL '6 days'),
    ('b50e8400-e29b-41d4-a716-446655440017', 'a50e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'My legs would be jelly after this 😅', NOW() - INTERVAL '5 days');

-- Insert Follow Relationships
INSERT INTO follow (follower_id, followee_id, status, created_at, responded_at)
VALUES 
    -- Bryant follows everyone
    ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'ACCEPTED', NOW() - INTERVAL '100 days', NOW() - INTERVAL '100 days'),
    ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'PENDING', NOW() - INTERVAL '10 days', NULL),
    ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'ACCEPTED', NOW() - INTERVAL '80 days', NOW() - INTERVAL '80 days'),
    
    -- Max follows Bryant and Alton
    ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'ACCEPTED', NOW() - INTERVAL '95 days', NOW() - INTERVAL '95 days'),
    ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'ACCEPTED', NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days'),
    
    -- Kobe follows Max (private account, so others need approval)
    ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'ACCEPTED', NOW() - INTERVAL '85 days', NOW() - INTERVAL '85 days'),
    
    -- Alton follows everyone
    ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'ACCEPTED', NOW() - INTERVAL '75 days', NOW() - INTERVAL '75 days'),
    ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'ACCEPTED', NOW() - INTERVAL '65 days', NOW() - INTERVAL '65 days'),
    ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'PENDING', NOW() - INTERVAL '5 days', NULL);

-- Verify data insertion
SELECT 'Users created: ' || COUNT(*) FROM app_user;
SELECT 'Exercises created: ' || COUNT(*) FROM exercise;
SELECT 'Workouts created: ' || COUNT(*) FROM workout;
SELECT 'Workout exercises created: ' || COUNT(*) FROM workout_exercise;
SELECT 'Workout sets created: ' || COUNT(*) FROM workout_set;
SELECT 'Posts created: ' || COUNT(*) FROM post;
SELECT 'Post likes created: ' || COUNT(*) FROM post_like;
SELECT 'Post comments created: ' || COUNT(*) FROM post_comment;
SELECT 'Follow relationships created: ' || COUNT(*) FROM follow;
