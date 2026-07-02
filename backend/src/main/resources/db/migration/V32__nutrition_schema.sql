-- Calorie & macro tracking (MyFitnessPal-style).
--
-- food_item        : seeded USDA FoodData Central foods. Nutrients are stored
--                    per 100 g (the USDA standard); per-serving amounts are
--                    computed on the fly. Seeded by V33__seed_usda_foods.
-- nutrition_goal   : one row per user holding their daily calorie/macro targets.
-- food_log_entry   : a user's logged foods for a given day & meal. Macro amounts
--                    are snapshotted at log time so history stays correct even if
--                    the source food row changes (or the entry is a quick-add).

CREATE TABLE food_item (
    food_id           UUID PRIMARY KEY,
    fdc_id            BIGINT UNIQUE,
    description       VARCHAR(512) NOT NULL,
    brand_owner       VARCHAR(255),
    data_type         VARCHAR(32),
    serving_size      NUMERIC,
    serving_unit      VARCHAR(32),
    household_serving VARCHAR(255),
    calories          NUMERIC,
    protein_g         NUMERIC,
    carbs_g           NUMERIC,
    fat_g             NUMERIC
);

-- Trigram index for fuzzy / substring food search (mirrors the user-search
-- approach from V17). pg_trgm is already used elsewhere in the schema.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_food_item_description_trgm
    ON food_item USING gin (LOWER(description) gin_trgm_ops);

CREATE TABLE nutrition_goal (
    goal_id      UUID PRIMARY KEY,
    user_id      UUID NOT NULL UNIQUE REFERENCES app_user(user_id) ON DELETE CASCADE,
    calorie_goal INTEGER NOT NULL,
    protein_g    INTEGER NOT NULL,
    carbs_g      INTEGER NOT NULL,
    fat_g        INTEGER NOT NULL,
    is_custom    BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at   TIMESTAMP(6) NOT NULL
);

CREATE TABLE food_log_entry (
    entry_id    UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    food_id     UUID REFERENCES food_item(food_id) ON DELETE SET NULL,
    log_date    DATE NOT NULL,
    meal_type   VARCHAR(16) NOT NULL,
    quantity    NUMERIC NOT NULL,
    unit        VARCHAR(16) NOT NULL,
    description VARCHAR(512),
    calories    NUMERIC,
    protein_g   NUMERIC,
    carbs_g     NUMERIC,
    fat_g       NUMERIC,
    created_at  TIMESTAMP(6) NOT NULL,
    CONSTRAINT food_log_entry_meal_type_check
        CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK')),
    CONSTRAINT food_log_entry_unit_check
        CHECK (unit IN ('SERVING', 'GRAM'))
);

CREATE INDEX idx_food_log_entry_user_date
    ON food_log_entry (user_id, log_date);
