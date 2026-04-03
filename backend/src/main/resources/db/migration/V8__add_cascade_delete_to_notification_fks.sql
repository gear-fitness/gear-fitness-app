ALTER TABLE notification
  DROP CONSTRAINT fk_notification_comment,
  ADD CONSTRAINT fk_notification_comment
    FOREIGN KEY (comment_id) REFERENCES post_comment(comment_id) ON DELETE CASCADE;

ALTER TABLE notification
  DROP CONSTRAINT fk_notification_post,
  ADD CONSTRAINT fk_notification_post
    FOREIGN KEY (post_id) REFERENCES post(post_id) ON DELETE CASCADE;

ALTER TABLE notification
  DROP CONSTRAINT fk_notification_actor,
  ADD CONSTRAINT fk_notification_actor
    FOREIGN KEY (actor_user_id) REFERENCES app_user(user_id) ON DELETE CASCADE;

ALTER TABLE notification
  DROP CONSTRAINT fk_notification_recipient,
  ADD CONSTRAINT fk_notification_recipient
    FOREIGN KEY (recipient_user_id) REFERENCES app_user(user_id) ON DELETE CASCADE;