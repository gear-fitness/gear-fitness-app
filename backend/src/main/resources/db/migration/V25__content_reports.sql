-- User-submitted content reports against posts. The moderation dashboard lives
-- in a separate repo and reads/decides against this same table directly.
CREATE TABLE report (
    report_id UUID PRIMARY KEY,
    post_id UUID NOT NULL,
    reporter_id UUID NOT NULL,
    reason VARCHAR(20) NOT NULL,
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_report_post
        FOREIGN KEY (post_id)
        REFERENCES post(post_id),

    CONSTRAINT fk_report_reporter
        FOREIGN KEY (reporter_id)
        REFERENCES app_user(user_id),

    CONSTRAINT report_reason_check
        CHECK (reason IN ('NUDITY','SPAM','HARASSMENT','VIOLENCE','OTHER')),

    CONSTRAINT report_status_check
        CHECK (status IN ('PENDING','ACTIONED','DISMISSED')),

    -- A user can only report a given post once
    CONSTRAINT uq_report_reporter_post UNIQUE (reporter_id, post_id)
);

-- Counting distinct pending reporters per post drives the auto-hide threshold
CREATE INDEX idx_report_post_status ON report (post_id, status);

-- moderation_status governs whether a post is served by feeds and post fetches.
ALTER TABLE post ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'VISIBLE';
ALTER TABLE post ADD CONSTRAINT post_moderation_status_check
    CHECK (moderation_status IN ('VISIBLE','HIDDEN','REMOVED'));
