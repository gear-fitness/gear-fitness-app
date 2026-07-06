-- Replace the fixed BREAKFAST/LUNCH/DINNER/SNACK meal_type column with
-- user-defined meal categories. Each user can create, rename, and delete
-- their own meal sections; defaults (Breakfast, Lunch, Dinner) are seeded
-- lazily by NutritionService on first use.

CREATE TABLE meal_category (
    category_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMP(6) NOT NULL DEFAULT now(),
    UNIQUE (user_id, name)
);

-- Swap the fixed-enum meal_type for a nullable FK to the new table.
-- ON DELETE CASCADE: removing a category also removes its log entries.
ALTER TABLE food_log_entry
    DROP CONSTRAINT IF EXISTS food_log_entry_meal_type_check,
    DROP COLUMN meal_type,
    ADD COLUMN category_id UUID REFERENCES meal_category(category_id) ON DELETE CASCADE;
