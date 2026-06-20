-- Add REPLY (comment replies) and MENTION (@mentions) notification types.
-- Mirrors the V24 pattern: drop and re-add the CHECK with the full value list.
-- Existing rows already satisfy the wider set, so this cannot fail.
ALTER TABLE notification DROP CONSTRAINT IF EXISTS notification_type_check;

ALTER TABLE notification ADD CONSTRAINT notification_type_check
    CHECK (type IN ('FOLLOW','FOLLOW_REQUEST','COMMENT','LIKE','REPLY','MENTION'));
