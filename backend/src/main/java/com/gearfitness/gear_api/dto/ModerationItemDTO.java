package com.gearfitness.gear_api.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One item in the moderation review queue. Exactly one of postId/userId is set
 * (post image vs profile picture). imageViewUrl is a short-lived presigned GET
 * so the reviewer can look at the flagged image directly; null if presigning
 * failed for the key.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerationItemDTO {

  private UUID moderationId;
  private UUID postId;
  private UUID userId;
  private String imageKey;
  private String imageViewUrl;
  private String status;
  private String labels;
  private BigDecimal maxConfidence;
  private LocalDateTime createdAt;
}
