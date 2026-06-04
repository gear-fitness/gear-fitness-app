ALTER TABLE notification DROP CONSTRAINT IF EXISTS notification_type_check;

ALTER TABLE notification ADD CONSTRAINT notification_type_check
    CHECK (type IN ('FOLLOW', 'FOLLOW_REQUEST', 'COMMENT', 'LIKE'));
