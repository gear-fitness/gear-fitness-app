-- Server-driven "What's New" announcement popup.
--
-- announcement: one row per campaign. Activation, targeting, and the kill
-- switch all live here so a campaign can be launched or stopped with a DB
-- update and no app release. features and cta_params hold JSON strings
-- parsed app-side, matching the nutrition_cache TEXT-as-JSON convention.
-- Version bounds are inclusive and compared segment-wise app-server-side;
-- NULL means unbounded on that end.
--
-- announcement_event: per-user IMPRESSION / CTA / DISMISS rows. Doubles as
-- the server-side "seen" source of truth: a DISMISS or CTA row hides the
-- announcement from that user's /pending response on every device.

CREATE TABLE IF NOT EXISTS announcement (
    announcement_id  UUID PRIMARY KEY,
    active           BOOLEAN NOT NULL DEFAULT TRUE,
    title            VARCHAR(120) NOT NULL,
    body             TEXT,
    icon             VARCHAR(64) NOT NULL DEFAULT 'sparkles',
    features         TEXT,
    cta_label        VARCHAR(60) NOT NULL,
    cta_route        VARCHAR(64) NOT NULL,
    cta_params       TEXT,
    audience         VARCHAR(20) NOT NULL DEFAULT 'ALL',
    min_app_version  VARCHAR(20),
    max_app_version  VARCHAR(20),
    starts_at        TIMESTAMP(6),
    ends_at          TIMESTAMP(6),
    created_at       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT announcement_audience_check
        CHECK (audience IN ('ALL', 'FREE_ONLY', 'PLUS_ONLY'))
);

CREATE INDEX IF NOT EXISTS idx_announcement_active ON announcement (active);

CREATE TABLE IF NOT EXISTS announcement_event (
    event_id         UUID PRIMARY KEY,
    announcement_id  UUID NOT NULL,
    user_id          UUID NOT NULL,
    event_type       VARCHAR(20) NOT NULL,
    created_at       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Cascades are load-bearing: AccountPurger deletes app_user rows directly
    -- and relies on FK cascades to clear dependents.
    CONSTRAINT fk_announcement_event_announcement
        FOREIGN KEY (announcement_id)
        REFERENCES announcement(announcement_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_announcement_event_user
        FOREIGN KEY (user_id)
        REFERENCES app_user(user_id)
        ON DELETE CASCADE,

    CONSTRAINT announcement_event_type_check
        CHECK (event_type IN ('IMPRESSION', 'CTA', 'DISMISS')),

    -- One row per user per event type: dedupes repeat impressions across
    -- relaunches and caps growth at three rows per user per announcement.
    CONSTRAINT uq_announcement_event_user_type
        UNIQUE (announcement_id, user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_announcement_event_user
    ON announcement_event (user_id);
