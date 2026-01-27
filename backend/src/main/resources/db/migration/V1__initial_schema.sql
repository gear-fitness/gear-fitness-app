-- V1__initial_schema.sql
-- Baseline schema for Gear Fitness API
-- Generated from production RDS on 2026-01-27

-- Users
CREATE TABLE app_user (
    user_id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    age INTEGER,
    height_inches INTEGER,
    weight_lbs INTEGER,
    is_private BOOLEAN NOT NULL,
    created_at TIMESTAMP(6) NOT NULL
);

-- Exercises
CREATE TABLE exercise (
    exercise_id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    body_part VARCHAR(255) NOT NULL,
    CONSTRAINT exercise_body_part_check CHECK (body_part IN ('CHEST','BACK','SHOULDERS','BICEPS','TRICEPS','LEGS','QUADS','HAMSTRINGS','GLUTES','CALVES','CORE','TRAPS','FOREARMS','FULL_BODY','OTHER'))
);

-- Workouts
CREATE TABLE workout (
    workout_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    date_performed DATE NOT NULL,
    duration_min INTEGER,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk1hu09abkas1a5opg6audiu7sf FOREIGN KEY (user_id) REFERENCES app_user(user_id)
);

-- Workout body tags
CREATE TABLE workout_body_tags (
    workout_id UUID NOT NULL,
    body_tag VARCHAR(255),
    CONSTRAINT workout_body_tags_body_tag_check CHECK (body_tag IN ('FULL_BODY','CHEST','BACK','SHOULDERS','BICEPS','TRICEPS','LEGS','GLUTES','HAMSTRINGS','QUADS','CALVES','CORE','OTHER')),
    CONSTRAINT fk83qj2l75f92aa84oc0kb1evwp FOREIGN KEY (workout_id) REFERENCES workout(workout_id)
);

-- Workout exercises
CREATE TABLE workout_exercise (
    workout_exercise_id UUID PRIMARY KEY,
    workout_id UUID NOT NULL,
    exercise_id UUID NOT NULL,
    position INTEGER NOT NULL,
    note TEXT,
    CONSTRAINT fkqultuq4g6w47iqdaf0vb8ff3j FOREIGN KEY (workout_id) REFERENCES workout(workout_id),
    CONSTRAINT fkalytxvdcpsg2e2oo8ihk55dm2 FOREIGN KEY (exercise_id) REFERENCES exercise(exercise_id)
);

-- Workout sets
CREATE TABLE workout_set (
    workout_set_id UUID PRIMARY KEY,
    workout_exercise_id UUID NOT NULL,
    set_number INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight_lbs NUMERIC(10,2),
    is_pr BOOLEAN NOT NULL,
    CONSTRAINT fkce089umcbhrq7c6fl3opor8oq FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercise(workout_exercise_id)
);

-- Posts
CREATE TABLE post (
    post_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    workout_id UUID NOT NULL UNIQUE,
    caption TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk4p1xhm755mme4ykg5am4ati4r FOREIGN KEY (user_id) REFERENCES app_user(user_id),
    CONSTRAINT fk6gxxxkhu5cowv1l9gi30bmfhn FOREIGN KEY (workout_id) REFERENCES workout(workout_id)
);

-- Post comments
CREATE TABLE post_comment (
    comment_id UUID PRIMARY KEY,
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fkna4y825fdc5hw8aow65ijexm0 FOREIGN KEY (post_id) REFERENCES post(post_id),
    CONSTRAINT fktn9o2qg2pbf6hsiipmdb6viqd FOREIGN KEY (user_id) REFERENCES app_user(user_id)
);

-- Post likes
CREATE TABLE post_like (
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (post_id, user_id),
    CONSTRAINT fkj7iy0k7n3d0vkh8o7ibjna884 FOREIGN KEY (post_id) REFERENCES post(post_id),
    CONSTRAINT fkee9fdytls432ro572pe935dg7 FOREIGN KEY (user_id) REFERENCES app_user(user_id)
);

-- Follows
CREATE TABLE follow (
    follower_id UUID NOT NULL,
    followee_id UUID NOT NULL,
    status VARCHAR(255) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    responded_at TIMESTAMP(6),
    PRIMARY KEY (followee_id, follower_id),
    CONSTRAINT follow_status_check CHECK (status IN ('PENDING','ACCEPTED','DECLINED','BLOCKED')),
    CONSTRAINT fk5av1wi9disfs01d03888efs07 FOREIGN KEY (followee_id) REFERENCES app_user(user_id),
    CONSTRAINT fkavx0fwiga3lv4c1jf68g17002 FOREIGN KEY (follower_id) REFERENCES app_user(user_id)
);