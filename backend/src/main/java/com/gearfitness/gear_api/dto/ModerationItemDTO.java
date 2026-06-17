package com.gearfitness.gear_api.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** One item in the moderation review queue. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerationItemDTO {

  private UUID moderationId;
  private UUID postId;
  private String imageKey;
  private String status;
  private String labels;
  private BigDecimal maxConfidence;
  private LocalDateTime createdAt;
}
