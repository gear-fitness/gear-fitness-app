package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Message;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {
  /** One page of a conversation's history, newest first. */
  Page<Message> findByConversation_ConversationIdOrderByCreatedAtDesc(
    UUID conversationId,
    Pageable pageable
  );

  /** Most recent message in a conversation, for the inbox preview line. */
  Optional<Message> findFirstByConversation_ConversationIdOrderByCreatedAtDesc(
    UUID conversationId
  );

  /**
   * Existing message for a client nonce, used to make sends idempotent: a retry
   * or post-reconnect replay returns the already-persisted message instead of
   * inserting a duplicate.
   */
  Optional<Message> findByConversation_ConversationIdAndSender_UserIdAndClientNonce(
    UUID conversationId,
    UUID senderId,
    String clientNonce
  );

  /**
   * Total unread messages across all of the user's accepted conversations, for
   * the bottom-nav badge. Unread = messages from someone else, not soft-deleted,
   * newer than the user's read pointer.
   */
  @Query(
    """
        SELECT COUNT(m) FROM Message m, ConversationParticipant p
        WHERE p.conversation = m.conversation
          AND p.user.userId = :userId
          AND p.state = com.gearfitness.gear_api.entity.ConversationParticipant.ParticipantState.ACCEPTED
          AND p.leftAt IS NULL
          AND p.hiddenAt IS NULL
          AND m.sender.userId <> :userId
          AND m.deletedAt IS NULL
          AND (p.lastReadAt IS NULL OR m.createdAt > p.lastReadAt)
    """
  )
  long countTotalUnread(@Param("userId") UUID userId);

  /**
   * Per-conversation unread counts for the given conversations, batched so an
   * inbox page resolves all unread badges in a single query.
   */
  @Query(
    """
        SELECT m.conversation.conversationId, COUNT(m)
        FROM Message m, ConversationParticipant p
        WHERE p.conversation = m.conversation
          AND p.user.userId = :userId
          AND p.hiddenAt IS NULL
          AND m.conversation.conversationId IN :conversationIds
          AND m.sender.userId <> :userId
          AND m.deletedAt IS NULL
          AND (p.lastReadAt IS NULL OR m.createdAt > p.lastReadAt)
        GROUP BY m.conversation.conversationId
    """
  )
  List<Object[]> countUnreadByConversation(
    @Param("userId") UUID userId,
    @Param("conversationIds") List<UUID> conversationIds
  );
}
