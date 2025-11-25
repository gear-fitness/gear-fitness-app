-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Clear existing data (optional - comment out if you want to keep existing data)
TRUNCATE TABLE workout_set, workout_exercise, post_comment, post_like, post, workout, exercise, follow, app_user CASCADE;

-- Insert Users
INSERT INTO app_user (user_id, username, email, password_hash, is_private, created_at)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'bryant', 'bryant@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', false, NOW() - INTERVAL '120 days'),
    ('550e8400-e29b-41d4-a716-446655440002', 'max', 'max@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', false, NOW() - INTERVAL '100 days'),
    ('550e8400-e29b-41d4-a716-446655440003', 'kobe', 'kobe@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', true, NOW() - INTERVAL '90 days'),
    ('550e8400-e29b-41d4-a716-446655440004', 'alton', 'alton@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', false, NOW() - INTERVAL '80 days');

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
    ('750e8400-e29b-41d4-a716-446655440003', 'Back Day', CURRENT_DATE - INTERVAL '7 days', 80, 'BACK', NOW() - INTERVAL '7 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440011', 'Shoulder Workout', CURRENT_DATE - INTERVAL '10 days', 65, 'SHOULDERS', NOW() - INTERVAL '10 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440012', 'Arm Day', CURRENT_DATE - INTERVAL '12 days', 50, 'BICEPS', NOW() - INTERVAL '12 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440013', 'Full Body', CURRENT_DATE - INTERVAL '15 days', 85, 'FULL_BODY', NOW() - INTERVAL '15 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440014', 'Chest & Triceps', CURRENT_DATE - INTERVAL '18 days', 70, 'CHEST', NOW() - INTERVAL '18 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440015', 'Leg Power', CURRENT_DATE - INTERVAL '20 days', 95, 'LEGS', NOW() - INTERVAL '20 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440016', 'Back & Biceps', CURRENT_DATE - INTERVAL '22 days', 75, 'BACK', NOW() - INTERVAL '22 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440017', 'Core Workout', CURRENT_DATE - INTERVAL '25 days', 40, 'CORE', NOW() - INTERVAL '25 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440018', 'Upper Body', CURRENT_DATE - INTERVAL '28 days', 80, 'CHEST', NOW() - INTERVAL '28 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440019', 'Lower Body', CURRENT_DATE - INTERVAL '30 days', 90, 'LEGS', NOW() - INTERVAL '30 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440020', 'Push Day', CURRENT_DATE - INTERVAL '33 days', 65, 'CHEST', NOW() - INTERVAL '33 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440021', 'Pull Day', CURRENT_DATE - INTERVAL '35 days', 70, 'BACK', NOW() - INTERVAL '35 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440022', 'Legs & Glutes', CURRENT_DATE - INTERVAL '38 days', 85, 'LEGS', NOW() - INTERVAL '38 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440023', 'Chest Focus', CURRENT_DATE - INTERVAL '40 days', 60, 'CHEST', NOW() - INTERVAL '40 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440024', 'Back Thickness', CURRENT_DATE - INTERVAL '42 days', 75, 'BACK', NOW() - INTERVAL '42 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440025', 'Shoulder Press Day', CURRENT_DATE - INTERVAL '45 days', 55, 'SHOULDERS', NOW() - INTERVAL '45 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440026', 'Squat Day', CURRENT_DATE - INTERVAL '47 days', 100, 'LEGS', NOW() - INTERVAL '47 days', '550e8400-e29b-41d4-a716-446655440001'),
    ('750e8400-e29b-41d4-a716-446655440027', 'Deadlift Focus', CURRENT_DATE - INTERVAL '50 days', 70, 'BACK', NOW() - INTERVAL '50 days', '550e8400-e29b-41d4-a716-446655440001');

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

-- Insert Workout Sets for Bryant's Bench Press
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_kg, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', 1, 8, 100.00, false),
    ('950e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440001', 2, 8, 100.00, false),
    ('950e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440001', 3, 6, 105.00, false),
    ('950e8400-e29b-41d4-a716-446655440004', '850e8400-e29b-41d4-a716-446655440001', 4, 5, 110.00, true);

-- Insert Workout Sets for Bryant's Incline Bench
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_kg, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440005', '850e8400-e29b-41d4-a716-446655440002', 1, 10, 80.00, false),
    ('950e8400-e29b-41d4-a716-446655440006', '850e8400-e29b-41d4-a716-446655440002', 2, 10, 80.00, false),
    ('950e8400-e29b-41d4-a716-446655440007', '850e8400-e29b-41d4-a716-446655440002', 3, 8, 85.00, false);

-- Insert Workout Sets for Bryant's Dips
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_kg, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440008', '850e8400-e29b-41d4-a716-446655440003', 1, 12, NULL, false),
    ('950e8400-e29b-41d4-a716-446655440009', '850e8400-e29b-41d4-a716-446655440003', 2, 10, NULL, false),
    ('950e8400-e29b-41d4-a716-446655440010', '850e8400-e29b-41d4-a716-446655440003', 3, 8, NULL, false);

-- Insert Workout Sets for Bryant's Squats
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_kg, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440011', '850e8400-e29b-41d4-a716-446655440004', 1, 5, 140.00, false),
    ('950e8400-e29b-41d4-a716-446655440012', '850e8400-e29b-41d4-a716-446655440004', 2, 5, 140.00, false),
    ('950e8400-e29b-41d4-a716-446655440013', '850e8400-e29b-41d4-a716-446655440004', 3, 5, 150.00, true),
    ('950e8400-e29b-41d4-a716-446655440014', '850e8400-e29b-41d4-a716-446655440004', 4, 3, 160.00, true);

-- Insert Workout Sets for Bryant's Leg Press
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_kg, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440015', '850e8400-e29b-41d4-a716-446655440005', 1, 12, 200.00, false),
    ('950e8400-e29b-41d4-a716-446655440016', '850e8400-e29b-41d4-a716-446655440005', 2, 12, 200.00, false),
    ('950e8400-e29b-41d4-a716-446655440017', '850e8400-e29b-41d4-a716-446655440005', 3, 10, 220.00, false);

-- Insert Workout Sets for Max's Bench Press
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_kg, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440018', '850e8400-e29b-41d4-a716-446655440011', 1, 3, 120.00, false),
    ('950e8400-e29b-41d4-a716-446655440019', '850e8400-e29b-41d4-a716-446655440011', 2, 3, 125.00, false),
    ('950e8400-e29b-41d4-a716-446655440020', '850e8400-e29b-41d4-a716-446655440011', 3, 2, 130.00, true);

-- Insert Workout Sets for Max's OHP
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_kg, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440021', '850e8400-e29b-41d4-a716-446655440012', 1, 5, 60.00, false),
    ('950e8400-e29b-41d4-a716-446655440022', '850e8400-e29b-41d4-a716-446655440012', 2, 5, 60.00, false),
    ('950e8400-e29b-41d4-a716-446655440023', '850e8400-e29b-41d4-a716-446655440012', 3, 5, 65.00, true);

-- Insert Workout Sets for Kobe's Deadlift
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_kg, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440024', '850e8400-e29b-41d4-a716-446655440016', 1, 5, 180.00, false),
    ('950e8400-e29b-41d4-a716-446655440025', '850e8400-e29b-41d4-a716-446655440016', 2, 5, 190.00, false),
    ('950e8400-e29b-41d4-a716-446655440026', '850e8400-e29b-41d4-a716-446655440016', 3, 3, 200.00, true),
    ('950e8400-e29b-41d4-a716-446655440027', '850e8400-e29b-41d4-a716-446655440016', 4, 1, 210.00, true);

-- Insert Workout Sets for Alton's exercises
INSERT INTO workout_set (workout_set_id, workout_exercise_id, set_number, reps, weight_kg, is_pr)
VALUES 
    ('950e8400-e29b-41d4-a716-446655440028', '850e8400-e29b-41d4-a716-446655440023', 1, 10, 90.00, false),
    ('950e8400-e29b-41d4-a716-446655440029', '850e8400-e29b-41d4-a716-446655440023', 2, 10, 90.00, false),
    ('950e8400-e29b-41d4-a716-446655440030', '850e8400-e29b-41d4-a716-446655440023', 3, 8, 95.00, false),
    ('950e8400-e29b-41d4-a716-446655440031', '850e8400-e29b-41d4-a716-446655440026', 1, 8, 170.00, false),
    ('950e8400-e29b-41d4-a716-446655440032', '850e8400-e29b-41d4-a716-446655440026', 2, 6, 180.00, false),
    ('950e8400-e29b-41d4-a716-446655440033', '850e8400-e29b-41d4-a716-446655440029', 1, 8, 120.00, false),
    ('950e8400-e29b-41d4-a716-446655440034', '850e8400-e29b-41d4-a716-446655440029', 2, 8, 120.00, false),
    ('950e8400-e29b-41d4-a716-446655440035', '850e8400-e29b-41d4-a716-446655440029', 3, 6, 130.00, false);

-- Insert Posts
INSERT INTO post (post_id, workout_id, image_url, caption, user_id, created_at)
VALUES
    ('a50e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'https://example.com/images/bryant-chest.jpg', 'Hit a new PR on bench today! 💪 110kg for 5 reps. Feeling strong!', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '2 days'),
    ('a50e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 'https://example.com/images/bryant-legs.jpg', 'Leg day complete! Squats felt heavy but got through it. 🦵', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '5 days'),
    ('a50e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440004', 'https://example.com/images/max-upper.jpg', 'Upper body power session done! New bench PR 🔥', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '1 day'),
    ('a50e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440006', 'https://example.com/images/kobe-fullbody.jpg', '210kg deadlift PR! Been chasing this for months 🎯', '550e8400-e29b-41d4-a716-446655440003', NOW()),
    ('a50e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440008', 'https://example.com/images/alton-push.jpg', 'Solid push day. Chest and shoulders on fire! 🔥', '550e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '1 day'),
    ('a50e8400-e29b-41d4-a716-446655440006', '750e8400-e29b-41d4-a716-446655440010', 'https://example.com/images/alton-legs.jpg', 'Leg day destroyed me but worth it! Never skip leg day 🦵', '550e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '6 days'),
    ('a50e8400-e29b-41d4-a716-446655440007', '750e8400-e29b-41d4-a716-446655440003', 'https://example.com/images/bryant-back.jpg', 'Back day was intense! Deadlifts and rows on point', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '7 days'),
    ('a50e8400-e29b-41d4-a716-446655440008', '750e8400-e29b-41d4-a716-446655440011', 'https://example.com/images/bryant-shoulders.jpg', 'Shoulder workout done! OHP felt strong today', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '10 days'),
    ('a50e8400-e29b-41d4-a716-446655440009', '750e8400-e29b-41d4-a716-446655440012', 'https://example.com/images/bryant-arms.jpg', 'Arm day pump is unreal! Biceps and triceps looking good', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '12 days'),
    ('a50e8400-e29b-41d4-a716-446655440010', '750e8400-e29b-41d4-a716-446655440013', 'https://example.com/images/bryant-fullbody.jpg', 'Full body session complete! Feeling accomplished', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '15 days'),
    ('a50e8400-e29b-41d4-a716-446655440011', '750e8400-e29b-41d4-a716-446655440014', 'https://example.com/images/bryant-chest2.jpg', 'Chest and triceps day! Great pump from this combo', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '18 days'),
    ('a50e8400-e29b-41d4-a716-446655440012', '750e8400-e29b-41d4-a716-446655440015', 'https://example.com/images/bryant-legpower.jpg', 'Leg power workout crushed me! Heavy squats today', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '20 days'),
    ('a50e8400-e29b-41d4-a716-446655440013', '750e8400-e29b-41d4-a716-446655440016', 'https://example.com/images/bryant-backbiceps.jpg', 'Back and biceps session! Pull day never disappoints', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '22 days'),
    ('a50e8400-e29b-41d4-a716-446655440014', '750e8400-e29b-41d4-a716-446655440017', 'https://example.com/images/bryant-core.jpg', 'Core workout done! Abs are on fire right now', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '25 days'),
    ('a50e8400-e29b-41d4-a716-446655440015', '750e8400-e29b-41d4-a716-446655440018', 'https://example.com/images/bryant-upper.jpg', 'Upper body day complete! Bench and OHP combo', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '28 days'),
    ('a50e8400-e29b-41d4-a716-446655440016', '750e8400-e29b-41d4-a716-446655440019', 'https://example.com/images/bryant-lower.jpg', 'Lower body session finished! Legs are shaking', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '30 days'),
    ('a50e8400-e29b-41d4-a716-446655440017', '750e8400-e29b-41d4-a716-446655440020', 'https://example.com/images/bryant-push.jpg', 'Push day was solid! All pressing movements felt great', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '33 days'),
    ('a50e8400-e29b-41d4-a716-446655440018', '750e8400-e29b-41d4-a716-446655440021', 'https://example.com/images/bryant-pull.jpg', 'Pull day grind! Back width is improving', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '35 days'),
    ('a50e8400-e29b-41d4-a716-446655440019', '750e8400-e29b-41d4-a716-446655440022', 'https://example.com/images/bryant-glutes.jpg', 'Legs and glutes workout! RDLs hit different today', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '38 days'),
    ('a50e8400-e29b-41d4-a716-446655440020', '750e8400-e29b-41d4-a716-446655440023', 'https://example.com/images/bryant-chestfocus.jpg', 'Chest focus session! All bench variations today', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '40 days'),
    ('a50e8400-e29b-41d4-a716-446655440021', '750e8400-e29b-41d4-a716-446655440024', 'https://example.com/images/bryant-thickness.jpg', 'Back thickness day! Rows and deadlifts on deck', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '42 days'),
    ('a50e8400-e29b-41d4-a716-446655440022', '750e8400-e29b-41d4-a716-446655440025', 'https://example.com/images/bryant-shoulderpress.jpg', 'Shoulder press day! Overhead pressing felt smooth', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '45 days'),
    ('a50e8400-e29b-41d4-a716-446655440023', '750e8400-e29b-41d4-a716-446655440026', 'https://example.com/images/bryant-squat.jpg', 'Squat day! Working on depth and form', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '47 days'),
    ('a50e8400-e29b-41d4-a716-446655440024', '750e8400-e29b-41d4-a716-446655440027', 'https://example.com/images/bryant-deadlift.jpg', 'Deadlift focus! These never get easier', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '50 days');

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
    ('b50e8400-e29b-41d4-a716-446655440009', 'a50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '130kg bench is insane! Goals right there', NOW() - INTERVAL '20 hours'),
    
    -- Comments on Kobe's full body post
    ('b50e8400-e29b-41d4-a716-446655440010', 'a50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'YOOOO! 210kg is massive! Congrats dude!', NOW() - INTERVAL '2 hours'),
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