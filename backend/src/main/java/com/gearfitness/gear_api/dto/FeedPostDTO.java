package com.gearfitness.gear_api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedPostDTO {

  private UUID postId;
  private UUID workoutId;
  private String imageUrl;
  private List<String> photoUrls;
  private String caption;
  private LocalDateTime createdAt;

  private UUID userId;
  private String username;
  private String userProfilePictureUrl;

  private String workoutName;
  private LocalDate datePerformed;
  private Integer durationMin;
  private List<String> bodyTags;
  private Long exerciseCount;
  private Long setCount;
  // Cardio summary so the feed card can show "N cardio" / "Run · 32:00" without
  // a per-post detail fetch. cardioCount is 0 when the workout has no cardio;
  // the activity/duration describe the first cardio entry (by position).
  private Long cardioCount;
  private String cardioActivityType;
  private Integer cardioDurationSeconds;

  private Long likeCount;
  private Long commentCount;
  private Boolean likedByCurrentUser;
  private String visibility;
  private Boolean viewerFollowsAuthor;
}
