-- Subscription tier (BASIC | PLUS | ULTRA), driven by the RevenueCat webhook.
-- Add nullable -> backfill -> enforce NOT NULL + DEFAULT -> CHECK -> index,
-- mirroring the V23 enum-column convention. Timestamps use TIMESTAMP(6) to
-- match the LocalDateTime fields on AppUser.
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS tier VARCHAR(20);
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMP(6);
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS tier_product_id VARCHAR(255);
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS tier_store VARCHAR(40);

-- Existing users are on the free tier.
UPDATE app_user SET tier = 'BASIC' WHERE tier IS NULL;

ALTER TABLE app_user ALTER COLUMN tier SET NOT NULL;
ALTER TABLE app_user ALTER COLUMN tier SET DEFAULT 'BASIC';
ALTER TABLE app_user ADD CONSTRAINT app_user_tier_check
    CHECK (tier IN ('BASIC', 'PLUS', 'ULTRA'));

-- tier_expires_at / tier_product_id / tier_store stay nullable: a BASIC user
-- has no subscription.

CREATE INDEX IF NOT EXISTS idx_app_user_tier ON app_user (tier);
