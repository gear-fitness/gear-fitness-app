-- V1__initial_schema.sql

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

CREATE TABLE exercise (
    exercise_id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    body_part VARCHAR(255) NOT NULL CHECK (body_part IN ('CHEST','BACK','SHOULDERS','BICEPS','TRICEPS','LEGS','QUADS','HAMSTRINGS','GLUTES','CALVES','CORE','TRAPS','FOREARMS','FULL_BODY','OTHER'))
);

CREATE TABLE workout (
    workout_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    date_performed DATE NOT NULL,
    duration_min INTEGER,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_workout_user FOREIGN KEY (user_id) REFERENCES app_user(user_id)
);

CREATE TABLE workout_body_tags (
    workout_id UUID NOT NULL,
    body_tag VARCHAR(255) CHECK (body_tag IN ('FULL_BODY','CHEST','BACK','SHOULDERS','BICEPS','TRICEPS','LEGS','GLUTES','HAMSTRINGS','QUADS','CALVES','CORE','OTHER')),
    CONSTRAINT fk_workout_body_tags_workout FOREIGN KEY (workout_id) REFERENCES workout(workout_id)
);

CREATE TABLE workout_exercise (
    workout_exercise_id UUID PRIMARY KEY,
    workout_id UUID NOT NULL,
    exercise_id UUID NOT NULL,
    position INTEGER NOT NULL,
    note TEXT,
    CONSTRAINT fk_workout_exercise_workout FOREIGN KEY (workout_id) REFERENCES workout(workout_id),
    CONSTRAINT fk_workout_exercise_exercise FOREIGN KEY (exercise_id) REFERENCES exercise(exercise_id)
);

CREATE TABLE workout_set (
    workout_set_id UUID PRIMARY KEY,
    workout_exercise_id UUID NOT NULL,
    set_number INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight_lbs NUMERIC(10,2),
    is_pr BOOLEAN NOT NULL,
    CONSTRAINT fk_workout_set_workout_exercise FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercise(workout_exercise_id)
);

CREATE TABLE post (
    post_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    workout_id UUID NOT NULL UNIQUE,
    caption TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_post_user FOREIGN KEY (user_id) REFERENCES app_user(user_id),
    CONSTRAINT fk_post_workout FOREIGN KEY (workout_id) REFERENCES workout(workout_id)
);

CREATE TABLE post_comment (
    comment_id UUID PRIMARY KEY,
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_post_comment_post FOREIGN KEY (post_id) REFERENCES post(post_id),
    CONSTRAINT fk_post_comment_user FOREIGN KEY (user_id) REFERENCES app_user(user_id)
);

CREATE TABLE post_like (
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (post_id, user_id),
    CONSTRAINT fk_post_like_post FOREIGN KEY (post_id) REFERENCES post(post_id),
    CONSTRAINT fk_post_like_user FOREIGN KEY (user_id) REFERENCES app_user(user_id)
);

CREATE TABLE follow (
    follower_id UUID NOT NULL,
    followee_id UUID NOT NULL,
    status VARCHAR(255) NOT NULL CHECK (status IN ('PENDING','ACCEPTED','DECLINED','BLOCKED')),
    created_at TIMESTAMP(6) NOT NULL,
    responded_at TIMESTAMP(6),
    PRIMARY KEY (followee_id, follower_id),
    CONSTRAINT fk_follow_follower FOREIGN KEY (follower_id) REFERENCES app_user(user_id),
    CONSTRAINT fk_follow_followee FOREIGN KEY (followee_id) REFERENCES app_user(user_id)
);