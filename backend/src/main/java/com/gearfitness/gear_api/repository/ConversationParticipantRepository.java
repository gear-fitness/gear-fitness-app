package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Conversation;
import com.gearfitness.gear_api.entity.ConversationParticipant;
import com.gearfitness.gear_api.entity.ConversationParticipant.ParticipantId;
import com.gearfitness.gear_api.entity.ConversationParticipant.ParticipantState;
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
public interface ConversationParticipantRepository
  extends JpaRepository<ConversationParticipant, ParticipantId> {
  /**
   * The current user's conversations in a given routing state (ACCEPTED =
   * primary inbox, PENDING = requests), most recently active first. Hidden
   * conversations are excluded automatically by Conversation's @SQLRestriction.
   */
  @Query(
    """
        SELECT p.conversation FROM ConversationParticipant p
        WHERE p.user.userId = :userId
          AND p.state = :state
          AND p.leftAt IS NULL
          AND p.hiddenAt IS NULL
          AND p.conversation.lastMessageAt IS NOT NULL
        ORDER BY p.conversation.lastMessageAt DESC
    """
  )
  Page<Conversation> findConversationsByUserAndState(
    @Param("userId") UUID userId,
    @Param("state") ParticipantState state,
    Pageable pageable
  );


  /** All active members of a conversation. */
  List<ConversationParticipant> findByConversation_ConversationIdAndLeftAtIsNull(
    UUID conversationId
  );

  /**
   * Active members with their {@code user} eagerly fetched. Push notifications
   * are sent after the send transaction commits, so the association must be
   * loaded up front — a lazy {@code p.getUser()} there would throw
   * LazyInitializationException.
   */
  @Query(
    """
        SELECT p FROM ConversationParticipant p
        JOIN FETCH p.user
        WHERE p.conversation.conversationId = :conversationId
          AND p.leftAt IS NULL
    """
  )
  List<ConversationParticipant> findActiveWithUsers(
    @Param("conversationId") UUID conversationId
  );

  /**
   * Active member user ids only — used to fan out real-time events without
   * loading participant entities (safe to call outside a transaction).
   */
  @Query(
    """
        SELECT p.user.userId FROM ConversationParticipant p
        WHERE p.conversation.conversationId = :conversationId
          AND p.leftAt IS NULL
    """
  )
  List<UUID> findActiveParticipantUserIds(
    @Param("conversationId") UUID conversationId
  );

  /** All member rows of a conversation, including those who left. */
  List<ConversationParticipant> findByConversation_ConversationId(
    UUID conversationId
  );

  /** A single membership row (the caller's own row, or a target member's). */
  Optional<ConversationParticipant> findByConversation_ConversationIdAndUser_UserId(
    UUID conversationId,
    UUID userId
  );

  /**
   * Number of pending message requests for the section header. Counts only
   * conversations that actually have a message (mirrors the requests list,
   * which excludes message-less/draft conversations).
   */
  @Query(
    """
        SELECT COUNT(p) FROM ConversationParticipant p
        WHERE p.user.userId = :userId
          AND p.state = com.gearfitness.gear_api.entity.ConversationParticipant.ParticipantState.PENDING
          AND p.leftAt IS NULL
          AND p.hiddenAt IS NULL
          AND p.conversation.lastMessageAt IS NOT NULL
    """
  )
  long countPendingRequests(@Param("userId") UUID userId);
}
