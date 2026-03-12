CREATE TABLE notification (
    notification_id UUID PRIMARY KEY,
    recipient_user_id UUID NOT NULL,
    actor_user_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL,
    post_id UUID,
    comment_id UUID,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_notification_recipient
        FOREIGN KEY (recipient_user_id)
        REFERENCES app_user(user_id),

    CONSTRAINT fk_notification_actor
        FOREIGN KEY (actor_user_id)
        REFERENCES app_user(user_id),

    CONSTRAINT fk_notification_post
        FOREIGN KEY (post_id)
        REFERENCES post(post_id),

    CONSTRAINT fk_notification_comment
        FOREIGN KEY (comment_id)
        REFERENCES post_comment(comment_id),

    CONSTRAINT notification_type_check
        CHECK (type IN ('FOLLOW','COMMENT','LIKE'))
);