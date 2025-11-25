package com.gearfitness.gear_api.dto;

import java.time.LocalDate;
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
public class FeedPostDTO {
    private UUID postId;
    private UUID workoutId;
    private String imageUrl;
    private String caption;
    private LocalDateTime createdAt;

    private UUID userId;
    private String username;

    private String workoutName;
    private LocalDate datePerformed;
    private Integer durationMin;
    private String bodyTag;

    private Long likeCount;
    private Long commentCount;
    private Boolean likedByCurrentUser;

}
