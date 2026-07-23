package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

/**
 * A media attachment on a message. Stores the bare S3 key (rendered later via
 * short-lived presigned GET URLs, same as posts/avatars). Image-only for v1;
 * {@code mediaType} exists so video can be added without a schema change.
 */
@Entity
@Table(name = "message_media")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageMedia {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "message_media_id")
  private UUID messageMediaId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "message_id", nullable = false)
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Message message;

  @Column(name = "s3_key", nullable = false, length = 255)
  private String s3Key;

  @Enumerated(EnumType.STRING)
  @Column(name = "media_type", nullable = false, length = 20)
  @Builder.Default
  private MediaType mediaType = MediaType.IMAGE;

  @Column(nullable = false)
  @Builder.Default
  private int ordinal = 0;

  public enum MediaType {
    IMAGE,
  }
}
