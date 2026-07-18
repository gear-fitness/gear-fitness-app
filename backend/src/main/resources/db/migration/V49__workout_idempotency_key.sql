-- Client-supplied idempotency key for workout submission. Nullable so old
-- clients (which send no key) keep working; Postgres treats NULLs as distinct
-- in unique constraints, so multiple keyless rows per user are allowed.
ALTER TABLE workout ADD COLUMN idempotency_key VARCHAR(64);

ALTER TABLE workout ADD CONSTRAINT uq_workout_user_idempotency_key
    UNIQUE (user_id, idempotency_key);
