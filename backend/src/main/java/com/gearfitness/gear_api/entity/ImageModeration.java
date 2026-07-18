package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Outcome of running AWS Rekognition on a user-visible image. A row exists only
 * when there is something for a human to look at: FLAGGED (labels over the
 * confidence threshold; the content was hidden) or ERROR (moderation failed and
 * the content was left visible, fail-open). APPROVED/REJECTED are terminal
 * states set when a reviewer actions the item. Clean images create no row.
 *
 * <p>The subject is EITHER a post image ({@code post} set, the post was hidden
 * via moderation_status) OR a profile picture ({@code user} set, the avatar was
 * unlinked from the profile), never both, enforced by a DB CHECK.
 */
@Entity
@Table(name = "image_moderation")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageModeration {

  public enum Status {
    FLAGGED,
    APPROVED,
    REJECTED,
    ERROR,
  }

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "moderation_id")
  private UUID moderationId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "post_id")
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Post post;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id")
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private AppUser user;

  /**
   * Read-only mirrors of the FK columns. Post carries an @SQLRestriction that
   * hides non-VISIBLE rows and AppUser one that hides soft-deleted rows, so
   * touching the lazy associations of a flagged item can throw
   * EntityNotFoundException. Reads that only need the id must use these.
   */
  @Column(name = "post_id", insertable = false, updatable = false)
  private UUID postId;

  @Column(name = "user_id", insertable = false, updatable = false)
  private UUID userId;

  @Column(name = "image_key", nullable = false)
  private String imageKey;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private Status status;

  /** Raw Rekognition moderation labels as JSON, so a reviewer can see why. */
  @Column(columnDefinition = "TEXT")
  private String labels;

  @Column(name = "max_confidence")
  private BigDecimal maxConfidence;

  @Column(name = "error_message", columnDefinition = "TEXT")
  private String errorMessage;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "reviewed_at")
  private LocalDateTime reviewedAt;
}
