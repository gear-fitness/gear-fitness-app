package com.gearfitness.gear_api.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@AllArgsConstructor
@Builder
public class NotificationDTO {

  private UUID notificationId;
  private String type;
  private String actorUsername;
  private UUID postId;
  private UUID workoutId;
  private String commentBody;
  private LocalDateTime createdAt;
  private boolean isRead;
}
