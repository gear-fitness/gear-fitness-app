package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "conversation")
@SQLRestriction("hidden_at IS NULL")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "conversation_id")
  private UUID conversationId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private ConversationType type;

  // Group name; null for DIRECT threads.
  @Column(length = 100)
  private String title;

  // Group avatar S3 key; null for DIRECT threads.
  @Column(name = "image_key", length = 255)
  private String imageKey;

  @Column(name = "created_by", nullable = false)
  private UUID createdBy;

  // Canonical pair key least(a,b)||'_'||greatest(a,b) for DIRECT threads so a
  // given pair only ever has one 1:1 conversation; null for groups.
  @Column(name = "direct_key", length = 73)
  private String directKey;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  // Bumped on every send; drives inbox ordering (most recent first).
  @Column(name = "last_message_at")
  private LocalDateTime lastMessageAt;

  @Column(name = "hidden_at")
  private LocalDateTime hiddenAt;

  public enum ConversationType {
    DIRECT,
    GROUP,
  }
}
