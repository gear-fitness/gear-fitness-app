-- Reusable meals saved from the Smart Journal ("Save as Meal"). Items are held
-- as an opaque JSON array ([{name,calories,proteinG,carbsG,fatG}]) since they're
-- only ever read/written as a whole group.

CREATE TABLE saved_meal (
    meal_id    UUID PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES app_user (user_id) ON DELETE CASCADE,
    name       VARCHAR(200) NOT NULL,
    items_json TEXT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL
);

CREATE INDEX idx_saved_meal_user ON saved_meal (user_id);
