package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Membership of a user in a conversation. {@code state} drives inbox routing:
 * ACCEPTED rows appear in the primary inbox, PENDING rows appear under
 * "Requests" until the member accepts (mirrors Instagram message requests).
 * The read pointer ({@code lastReadMessageId} / {@code lastReadAt}) is stored
 * per member so "Seen" and unread counts are per-participant.
 */
@Entity
@Table(name = "conversation_participant")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(ConversationParticipant.ParticipantId.class)
public class ConversationParticipant {

  @Id
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "conversation_id", nullable = false)
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Conversation conversation;

  @Id
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private AppUser user;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  @Builder.Default
  private ParticipantRole role = ParticipantRole.MEMBER;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  @Builder.Default
  private ParticipantState state = ParticipantState.ACCEPTED;

  @Column(name = "last_read_message_id")
  private UUID lastReadMessageId;

  @Column(name = "last_read_at")
  private LocalDateTime lastReadAt;

  @Column(nullable = false)
  @Builder.Default
  private boolean muted = false;

  @Column(name = "added_by")
  private UUID addedBy;

  @CreationTimestamp
  @Column(name = "joined_at", nullable = false, updatable = false)
  private LocalDateTime joinedAt;

  @Column(name = "left_at")
  private LocalDateTime leftAt;

  /**
   * Set when the user deletes the chat (or declines a request): it drops out of
   * their inbox but is cleared as soon as a new message arrives, so the thread
   * returns and the sender is never blocked. Distinct from {@link #leftAt},
   * which permanently removes a member from a group.
   */
  @Column(name = "hidden_at")
  private LocalDateTime hiddenAt;

  public enum ParticipantRole {
    MEMBER,
    ADMIN,
  }

  public enum ParticipantState {
    PENDING,
    ACCEPTED,
  }

  // Composite key (conversation_id, user_id).
  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ParticipantId implements Serializable {

    private UUID conversation;
    private UUID user;

    @Override
    public boolean equals(Object o) {
      if (this == o) return true;
      if (o == null || getClass() != o.getClass()) return false;
      ParticipantId that = (ParticipantId) o;
      return (
        Objects.equals(conversation, that.conversation) &&
        Objects.equals(user, that.user)
      );
    }

    @Override
    public int hashCode() {
      return Objects.hash(conversation, user);
    }
  }
}
