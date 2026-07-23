-- Per-participant "not in my inbox right now" marker, backing Instagram-style
-- chat deletion.
--
-- Deleting a chat (and declining a message request) is LOCAL and REVERSIBLE: the
-- thread disappears from that user's inbox but comes back the moment a new
-- message arrives, so the sender is never blocked from reaching them.
--
-- This is deliberately NOT left_at. left_at means "I left this group" and is
-- permanent: it removes the participant from delivery, push, and membership
-- entirely. Overloading it as "delete" would be a trap on a 1:1 — direct_key
-- dedupe resolves the sender's next message to the SAME conversation, where the
-- deleter is still marked as left, making them permanently unreachable.
ALTER TABLE conversation_participant
    ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP(6);

-- Inbox/requests lists filter on (user_id, state) and now also hidden_at.
CREATE INDEX IF NOT EXISTS idx_cp_user_hidden
    ON conversation_participant (user_id, hidden_at);
