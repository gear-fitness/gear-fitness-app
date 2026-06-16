-- Per-user IANA time zone (e.g. "America/Denver"), reported by the device on
-- push-token registration. Used by the streak-restore notification scheduler
-- to fire at the user's local midnight instead of a single global UTC instant.
ALTER TABLE app_user
ADD COLUMN time_zone VARCHAR(64);
