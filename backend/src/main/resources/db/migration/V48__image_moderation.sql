-- Automated image moderation (AWS Rekognition) + human review queue.
-- One row per flagged image (labels over the confidence threshold) or per
-- image that errored during moderation. Clean images create no row.
--
-- A row's subject is EITHER a post image (post_id set) OR a profile picture
-- (user_id set), never both. A flagged post is hidden through the SAME
-- mechanism the report system uses (post.moderation_status = 'HIDDEN'); a
-- flagged profile picture is unlinked from the user (profile_picture_url set
-- to NULL). This table records WHY so a reviewer can approve (restore) or
-- confirm-reject. The raw Rekognition labels are kept for that judgement call.
CREATE TABLE image_moderation (
    moderation_id  UUID PRIMARY KEY,
    post_id        UUID,
    user_id        UUID,
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

    CONSTRAINT fk_imgmod_user
        FOREIGN KEY (user_id)
        REFERENCES app_user(user_id),

    CONSTRAINT imgmod_one_subject_check
        CHECK ((post_id IS NOT NULL) <> (user_id IS NOT NULL)),

    CONSTRAINT imgmod_status_check
        CHECK (status IN ('FLAGGED','APPROVED','REJECTED','ERROR'))
);

CREATE INDEX idx_imgmod_status ON image_moderation (status);
