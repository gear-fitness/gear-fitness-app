ALTER TABLE app_user
  ADD COLUMN deleted_at TIMESTAMP NULL;

CREATE INDEX idx_app_user_deleted_at ON app_user(deleted_at)
  WHERE deleted_at IS NOT NULL;