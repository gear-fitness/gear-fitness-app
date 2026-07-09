-- Calorie-calculator setup for the nutrition tracker.
--
-- app_user gains the two calculator inputs that onboarding collects but
-- previously dropped: activity level and goal weight.
ALTER TABLE app_user
    ADD COLUMN activity_level VARCHAR(20),
    ADD COLUMN goal_weight_lbs INTEGER;

-- nutrition_goal gains the user's chosen direction (cut / maintain / bulk),
-- how aggressive it is, and a flag marking that the first-view calculator
-- wizard has been completed (or explicitly skipped).
ALTER TABLE nutrition_goal
    ADD COLUMN goal_type VARCHAR(10) NOT NULL DEFAULT 'MAINTAIN',
    ADD COLUMN goal_intensity VARCHAR(12) NOT NULL DEFAULT 'MODERATE',
    ADD COLUMN setup_complete BOOLEAN NOT NULL DEFAULT FALSE;

-- Users who already hand-tuned their goals have effectively done setup;
-- don't show them the wizard.
UPDATE nutrition_goal SET setup_complete = TRUE WHERE is_custom = TRUE;
