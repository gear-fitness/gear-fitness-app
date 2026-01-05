-- ============================================================
-- Seed popular exercises (manual, beta-safe, idempotent)
-- ============================================================

-- CHEST
INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Bench Press', 'CHEST',
'Compound push exercise targeting chest, shoulders, and triceps.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Bench Press');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Incline Bench Press', 'CHEST',
'Upper chest focused pressing movement.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Incline Bench Press');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Dumbbell Bench Press', 'CHEST',
'Chest pressing exercise using dumbbells for greater range of motion.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Dumbbell Bench Press');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Chest Fly Machine', 'CHEST',
'Isolation exercise targeting the chest using a fly machine.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Chest Fly Machine');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Push Up', 'CHEST',
'Bodyweight pushing exercise targeting chest, shoulders, and triceps.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Push Up');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Chest Dips', 'CHEST',
'Bodyweight dip variation emphasizing chest engagement.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Chest Dips');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Cable Chest Fly', 'CHEST',
'Chest fly movement performed with cables.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Cable Chest Fly');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Incline Dumbbell Press', 'CHEST',
'Upper chest press using dumbbells.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Incline Dumbbell Press');

-- BACK
INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Deadlift', 'BACK',
'Full body compound exercise primarily targeting back and legs.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Deadlift');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Barbell Row', 'BACK',
'Horizontal pulling exercise for back thickness.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Barbell Row');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Pull Up', 'BACK',
'Vertical pulling exercise for back width and biceps.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Pull Up');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Lat Pulldown', 'BACK',
'Machine exercise for lat development.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Lat Pulldown');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Seated Cable Row', 'BACK',
'Horizontal pulling movement targeting mid back and lats.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Seated Cable Row');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Dumbbell Row', 'BACK',
'Single arm rowing exercise for back thickness and stability.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Dumbbell Row');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Assisted Pull Up', 'BACK',
'Pull up variation using machine assistance.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Assisted Pull Up');

-- SHOULDERS
INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Overhead Press', 'SHOULDERS',
'Vertical pressing movement for shoulders and triceps.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Overhead Press');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Arnold Press', 'SHOULDERS',
'Shoulder press variation with rotation.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Arnold Press');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Lateral Raise', 'SHOULDERS',
'Isolation exercise for lateral deltoid development.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Lateral Raise');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Front Raise', 'SHOULDERS',
'Isolation movement targeting the anterior deltoids.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Front Raise');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Face Pull', 'SHOULDERS',
'Cable exercise targeting rear delts and upper back.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Face Pull');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Reverse Fly Machine', 'SHOULDERS',
'Rear delt focused machine exercise.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Reverse Fly Machine');

-- BICEPS
INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Dumbbell Curl', 'BICEPS',
'Isolation exercise for biceps.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Dumbbell Curl');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Hammer Curl', 'BICEPS',
'Biceps exercise emphasizing the brachialis and forearms.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Hammer Curl');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Preacher Curl', 'BICEPS',
'Isolation curl performed on a preacher bench.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Preacher Curl');

-- TRICEPS
INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Tricep Dips', 'TRICEPS',
'Compound pushing exercise for triceps.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Tricep Dips');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Tricep Pushdown', 'TRICEPS',
'Cable exercise isolating the triceps.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Tricep Pushdown');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Skull Crushers', 'TRICEPS',
'Lying triceps extension targeting all three heads of the triceps.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Skull Crushers');

-- LEGS / LOWER BODY
INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Squat', 'LEGS',
'Compound lower body exercise targeting quads, glutes, and hamstrings.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Squat');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Leg Press', 'LEGS',
'Machine exercise for quads and glutes.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Leg Press');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Leg Extension', 'QUADS',
'Machine isolation exercise targeting the quadriceps.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Leg Extension');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Lunges', 'LEGS',
'Unilateral lower body exercise targeting quads and glutes.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Lunges');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Walking Lunges', 'LEGS',
'Dynamic lunge variation emphasizing balance and coordination.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Walking Lunges');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Goblet Squat', 'LEGS',
'Squat variation using a dumbbell or kettlebell.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Goblet Squat');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Bodyweight Squat', 'LEGS',
'Fundamental squat movement using bodyweight only.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Bodyweight Squat');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Box Jump', 'LEGS',
'Explosive plyometric lower body exercise.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Box Jump');

-- HAMSTRINGS / GLUTES / CALVES
INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Romanian Deadlift', 'HAMSTRINGS',
'Hip hinge movement targeting hamstrings and glutes.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Romanian Deadlift');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Leg Curl', 'HAMSTRINGS',
'Isolation exercise for hamstrings.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Leg Curl');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Seated Leg Curl', 'HAMSTRINGS',
'Machine exercise isolating the hamstrings.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Seated Leg Curl');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Hip Thrust', 'GLUTES',
'Glute focused hip extension movement.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Hip Thrust');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Glute Bridge', 'GLUTES',
'Bodyweight glute exercise emphasizing hip extension.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Glute Bridge');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Standing Calf Raise', 'CALVES',
'Standing calf exercise targeting the gastrocnemius.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Standing Calf Raise');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Calf Raise', 'CALVES',
'Isolation exercise for calves.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Calf Raise');

-- CORE / FULL BODY
INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Plank', 'CORE',
'Isometric core stability exercise.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Plank');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Crunch', 'CORE',
'Basic abdominal flexion exercise.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Crunch');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Russian Twist', 'CORE',
'Rotational core exercise emphasizing the obliques.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Russian Twist');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Hanging Leg Raise', 'CORE',
'Core exercise targeting lower abdominals using bodyweight.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Hanging Leg Raise');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Burpee', 'FULL_BODY',
'Full body bodyweight exercise combining squat, push up, and jump.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Burpee');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Mountain Climbers', 'CORE',
'Dynamic bodyweight core and conditioning exercise.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Mountain Climbers');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Kettlebell Swing', 'FULL_BODY',
'Explosive hip hinge exercise targeting the posterior chain.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Kettlebell Swing');

INSERT INTO exercise (exercise_id, name, body_part, description, image_url)
SELECT gen_random_uuid(), 'Farmer Carry', 'FULL_BODY',
'Loaded carry exercise improving grip and core stability.', NULL
WHERE NOT EXISTS (SELECT 1 FROM exercise WHERE name = 'Farmer Carry');