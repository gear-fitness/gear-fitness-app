ALTER TABLE notification ADD COLUMN hidden_at TIMESTAMP NULL;

CREATE INDEX idx_notification_actor_hidden ON notification(actor_user_id, hidden_at);
CREATE INDEX idx_notification_recipient_hidden ON notification(recipient_user_id, hidden_at);