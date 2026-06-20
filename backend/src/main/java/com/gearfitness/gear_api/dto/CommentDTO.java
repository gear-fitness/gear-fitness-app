package com.gearfitness.gear_api.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentDTO {

  private UUID commentId;
  private UUID postId;
  private UUID userId;
  private String username;
  private String userProfilePictureUrl;
  private String body;
  private LocalDateTime createdAt;

  /** Top-level parent comment id; null for top-level comments. */
  private UUID parentCommentId;

  /** Visible reply count; only populated for top-level comments. */
  private Long replyCount;
}
