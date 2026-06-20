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
  private UUID actorUserId;
  private String actorUsername;
  private String actorProfilePictureUrl;
  private UUID postId;
  private UUID workoutId;
  private String postImageUrl;
  private String commentBody;
  /** Thread-root comment id for reply/mention notifications, for deep-linking. */
  private UUID focusCommentId;
  private LocalDateTime createdAt;
  private boolean isRead;
}
