package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "message")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "message_id")
  private UUID messageId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "conversation_id", nullable = false)
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Conversation conversation;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "sender_id", nullable = false)
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private AppUser sender;

  // Null for media-only messages.
  @Column(columnDefinition = "TEXT")
  private String content;

  // Client-supplied idempotency token; a retry/replay with the same nonce is
  // deduped by uq_message_client_nonce.
  @Column(name = "client_nonce", length = 64)
  private String clientNonce;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "edited_at")
  private LocalDateTime editedAt;

  // Soft-delete ("unsend"). Kept (not @SQLRestriction'd) so read pointers that
  // reference this id stay valid; the DTO layer renders a tombstone.
  @Column(name = "deleted_at")
  private LocalDateTime deletedAt;

  @OneToMany(
    mappedBy = "message",
    cascade = CascadeType.ALL,
    orphanRemoval = true
  )
  @OrderBy("ordinal ASC")
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  @Builder.Default
  private List<MessageMedia> media = new ArrayList<>();
}
