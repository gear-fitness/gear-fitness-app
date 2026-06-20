package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "post_comment")
@SQLRestriction("hidden_at IS NULL AND moderation_status = 'VISIBLE'")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostComment {

  public enum ModerationStatus {
    VISIBLE,
    HIDDEN,
    REMOVED,
  }

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "comment_id")
  private UUID commentId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "post_id", nullable = false)
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Post post;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private AppUser user;

  /**
   * Top-level comment this is a reply to. NULL for top-level comments.
   * One-level only: replies to a reply collapse onto the same top-level parent.
   */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "parent_comment_id")
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private PostComment parentComment;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String body;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @OneToMany(mappedBy = "comment")
  @Builder.Default
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Set<Notification> notifications = new HashSet<>();

  @Column(name = "hidden_at")
  private LocalDateTime hiddenAt;

  @Enumerated(EnumType.STRING)
  @Column(name = "moderation_status", nullable = false)
  @Builder.Default
  private ModerationStatus moderationStatus = ModerationStatus.VISIBLE;
}
