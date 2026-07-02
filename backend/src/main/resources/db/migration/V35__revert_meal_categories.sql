-- Categories are now purely client-side visual cards (managed in the app's
-- local storage) with no backing table. Each food_log_entry instead carries a
-- free-text `category` label so logged food reappears under the right card when
-- a day is reloaded. This reverts the meal_category table introduced in V34.
--
-- Written additively (rather than rewriting V34) so it applies cleanly whether
-- or not V34 was already run against a given database.

ALTER TABLE food_log_entry ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Preserve any labels that were stored via the V34 FK approach.
UPDATE food_log_entry e
SET category = c.name
FROM meal_category c
WHERE e.category_id = c.category_id;

ALTER TABLE food_log_entry DROP COLUMN IF EXISTS category_id;
DROP TABLE IF EXISTS meal_category;
