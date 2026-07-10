-- Server-side persistence for the calorie tracker's journal note, so a delete
-- and reinstall (or a second device) restores the user's journal instead of
-- losing it with AsyncStorage.
--
-- nutrition_journal_note : one row per (user, date) holding the day's journal
--                          lines as an opaque JSONB blob. The line schema is
--                          owned by the client (FoodJournal); the server only
--                          validates that it is JSON and enforces a size cap.
--                          Conflict resolution is last-write-wins per date via
--                          updated_at.
--
-- food_log_entry.display_meta : the display unit/quantity an entry was logged
--                          in ("4 oz", "2 servings"), previously client-only.
--                          The entry rows themselves only store SERVING/GRAM.

CREATE TABLE nutrition_journal_note (
    note_id    UUID PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    log_date   DATE NOT NULL,
    content    JSONB NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT uq_journal_user_date UNIQUE (user_id, log_date)
);

ALTER TABLE food_log_entry ADD COLUMN display_meta JSONB;
