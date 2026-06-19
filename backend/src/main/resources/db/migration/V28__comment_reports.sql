-- User-submitted content reports against comments. Mirrors V25 (post reports).
-- The moderation dashboard lives in a separate repo and may read this table
-- directly.
CREATE TABLE comment_report (
    comment_report_id UUID PRIMARY KEY,
    comment_id UUID NOT NULL,
    reporter_id UUID NOT NULL,
    reason VARCHAR(20) NOT NULL,
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_comment_report_comment
        FOREIGN KEY (comment_id)
        REFERENCES post_comment(comment_id),

    CONSTRAINT fk_comment_report_reporter
        FOREIGN KEY (reporter_id)
        REFERENCES app_user(user_id),

    CONSTRAINT comment_report_reason_check
        CHECK (reason IN ('NUDITY','SPAM','HARASSMENT','VIOLENCE','OTHER')),

    CONSTRAINT comment_report_status_check
        CHECK (status IN ('PENDING','ACTIONED','DISMISSED')),

    -- A user can only report a given comment once
    CONSTRAINT uq_comment_report_reporter_comment UNIQUE (reporter_id, comment_id)
);

-- Counting distinct pending reporters per comment drives the auto-hide threshold
CREATE INDEX idx_comment_report_comment_status ON comment_report (comment_id, status);

-- moderation_status governs whether a comment is served by feeds and comment
-- fetches. Existing rows default to VISIBLE, preserving current behavior.
ALTER TABLE post_comment ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'VISIBLE';
ALTER TABLE post_comment ADD CONSTRAINT post_comment_moderation_status_check
    CHECK (moderation_status IN ('VISIBLE','HIDDEN','REMOVED'));
