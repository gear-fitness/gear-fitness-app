ALTER TABLE app_user
  ADD COLUMN apple_user_id VARCHAR(255) NULL;

ALTER TABLE app_user
  ADD CONSTRAINT uk_app_user_apple_user_id UNIQUE (apple_user_id);

CREATE INDEX idx_app_user_apple_user_id ON app_user(apple_user_id)
  WHERE apple_user_id IS NOT NULL;