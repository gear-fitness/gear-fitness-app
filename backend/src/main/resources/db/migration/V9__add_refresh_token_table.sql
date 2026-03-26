CREATE TABLE refresh_token (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_token_token ON refresh_token(token);
CREATE INDEX idx_refresh_token_user_id ON refresh_token(user_id);