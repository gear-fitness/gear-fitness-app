-- Automated image moderation (AWS Rekognition) + human review queue.
-- One row per post image that was flagged (labels over the confidence
-- threshold) or that errored during moderation. Clean images create no row.
-- A flagged post is hidden through the SAME mechanism the report system uses
-- (post.moderation_status = 'HIDDEN'); this table records WHY so a reviewer can
-- approve (un-hide) or confirm-reject. The raw Rekognition labels are kept for
-- that judgement call.
CREATE TABLE image_moderation (
    moderation_id  UUID PRIMARY KEY,
    post_id        UUID NOT NULL,
    image_key      VARCHAR(255) NOT NULL,
    status         VARCHAR(20) NOT NULL,
    labels         TEXT,
    max_confidence NUMERIC(5,2),
    error_message  TEXT,
    created_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at    TIMESTAMP(6),

    CONSTRAINT fk_imgmod_post
        FOREIGN KEY (post_id)
        REFERENCES post(post_id),

    CONSTRAINT imgmod_status_check
        CHECK (status IN ('FLAGGED','APPROVED','REJECTED','ERROR'))
);

CREATE INDEX idx_imgmod_status ON image_moderation (status);
