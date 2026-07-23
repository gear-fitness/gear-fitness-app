-- Instagram-style direct messaging.
--
-- Supports 1:1 and group conversations, per-participant message-request routing
-- (primary inbox vs. "Requests"), read pointers for "Seen"/unread counts, emoji
-- reactions, and image attachments. Real-time delivery is layered on top over
-- WebSocket in a later phase; this schema is the durable source of truth that the
-- REST history/pagination endpoints read from.

-- A conversation groups two (DIRECT) or many (GROUP) participants. For DIRECT
-- threads, direct_key is the canonical pair key least(a,b)||'_'||greatest(a,b)
-- so a given pair can only ever have a single 1:1 thread (partial-unique index
-- below); it is NULL for groups.
CREATE TABLE conversation (
    conversation_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type             VARCHAR(20) NOT NULL,
    title            VARCHAR(100),
    image_key        VARCHAR(255),
    created_by       UUID NOT NULL,
    direct_key       VARCHAR(73),
    created_at       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at  TIMESTAMP(6),
    hidden_at        TIMESTAMP(6),

    CONSTRAINT fk_conversation_creator
        FOREIGN KEY (created_by) REFERENCES app_user(user_id),
    CONSTRAINT conversation_type_check
        CHECK (type IN ('DIRECT', 'GROUP'))
);

CREATE UNIQUE INDEX uq_conversation_direct_key
    ON conversation (direct_key) WHERE type = 'DIRECT';

CREATE INDEX idx_conversation_last_message
    ON conversation (last_message_at DESC);

-- One row per (conversation, member). state drives inbox routing: ACCEPTED rows
-- show in the primary inbox, PENDING rows show under "Requests" until the member
-- accepts. last_read_message_id / last_read_at is the per-member read pointer:
-- last_read_message_id renders precise "Seen", last_read_at powers unread counts
-- without a join back to message. left_at soft-removes a member from a group.
CREATE TABLE conversation_participant (
    conversation_id       UUID NOT NULL,
    user_id               UUID NOT NULL,
    role                  VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    state                 VARCHAR(20) NOT NULL DEFAULT 'ACCEPTED',
    last_read_message_id  UUID,
    last_read_at          TIMESTAMP(6),
    muted                 BOOLEAN NOT NULL DEFAULT FALSE,
    added_by              UUID,
    joined_at             TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at               TIMESTAMP(6),

    PRIMARY KEY (conversation_id, user_id),
    CONSTRAINT fk_cp_conversation
        FOREIGN KEY (conversation_id) REFERENCES conversation(conversation_id) ON DELETE CASCADE,
    CONSTRAINT fk_cp_user
        FOREIGN KEY (user_id) REFERENCES app_user(user_id),
    CONSTRAINT cp_role_check CHECK (role IN ('MEMBER', 'ADMIN')),
    CONSTRAINT cp_state_check CHECK (state IN ('PENDING', 'ACCEPTED'))
);

CREATE INDEX idx_cp_user_state ON conversation_participant (user_id, state);

-- A single message. content is null for media-only messages. client_nonce makes
-- sends idempotent: a client retry or a post-reconnect replay carrying the same
-- nonce cannot create a duplicate (partial-unique index below). deleted_at
-- soft-deletes ("unsend") without breaking read pointers that reference the id.
CREATE TABLE message (
    message_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id  UUID NOT NULL,
    sender_id        UUID NOT NULL,
    content          TEXT,
    client_nonce     VARCHAR(64),
    created_at       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited_at        TIMESTAMP(6),
    deleted_at       TIMESTAMP(6),

    CONSTRAINT fk_message_conversation
        FOREIGN KEY (conversation_id) REFERENCES conversation(conversation_id) ON DELETE CASCADE,
    CONSTRAINT fk_message_sender
        FOREIGN KEY (sender_id) REFERENCES app_user(user_id)
);

CREATE UNIQUE INDEX uq_message_client_nonce
    ON message (conversation_id, sender_id, client_nonce)
    WHERE client_nonce IS NOT NULL;

CREATE INDEX idx_message_conversation_created
    ON message (conversation_id, created_at DESC);

-- Media attached to a message. Stores the bare S3 key (rendered later via
-- short-lived presigned GET URLs, same as posts/avatars). Image-only for v1;
-- media_type is here so video can be added without a schema change.
CREATE TABLE message_media (
    message_media_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id        UUID NOT NULL,
    s3_key            VARCHAR(255) NOT NULL,
    media_type        VARCHAR(20) NOT NULL DEFAULT 'IMAGE',
    ordinal           INT NOT NULL DEFAULT 0,

    CONSTRAINT fk_msgmedia_message
        FOREIGN KEY (message_id) REFERENCES message(message_id) ON DELETE CASCADE,
    CONSTRAINT msgmedia_type_check CHECK (media_type IN ('IMAGE'))
);

CREATE INDEX idx_msgmedia_message ON message_media (message_id);

-- Emoji reactions. One reaction per (message, user) matching Instagram; changing
-- the emoji is an upsert on the existing row.
CREATE TABLE message_reaction (
    message_id  UUID NOT NULL,
    user_id     UUID NOT NULL,
    emoji       VARCHAR(16) NOT NULL,
    created_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (message_id, user_id),
    CONSTRAINT fk_reaction_message
        FOREIGN KEY (message_id) REFERENCES message(message_id) ON DELETE CASCADE,
    CONSTRAINT fk_reaction_user
        FOREIGN KEY (user_id) REFERENCES app_user(user_id)
);
