-- User-created custom foods ("saved meals") live in food_item alongside the
-- seeded USDA rows so search and foodId-based logging work identically.
-- owner_user_id is NULL for seeded rows and set for custom rows, which are
-- only visible to their owner. Custom nutrition is entered per serving and
-- stored per-100g with serving_size = 100, so the existing scaling math is
-- exact for one serving.
ALTER TABLE food_item
    ADD COLUMN owner_user_id UUID REFERENCES app_user(user_id) ON DELETE CASCADE,
    ADD COLUMN nickname VARCHAR(100),
    ADD COLUMN created_at TIMESTAMP;

-- Partial index: the owner lookup only ever targets custom rows, so skip the
-- millions of seeded NULL rows.
CREATE INDEX idx_food_item_owner
    ON food_item(owner_user_id)
    WHERE owner_user_id IS NOT NULL;
