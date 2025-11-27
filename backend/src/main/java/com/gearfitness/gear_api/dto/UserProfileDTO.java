package com.gearfitness.gear_api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Enhanced user profile DTO that includes workout statistics and social metrics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDTO {
    // Basic user information (from UserDTO)
    private UUID userId;
    private String username;
    private String email;
    private Integer weightLbs;
    private Integer heightInches;
    private Integer age;
    private Boolean isPrivate;
    private LocalDateTime createdAt;

    // Workout statistics
    private WorkoutStatsDTO workoutStats;

    // Social metrics
    private Long followersCount;
    private Long followingCount;

    /**
     * Indicates whether the requesting user is following this profile user
     * Null if viewing own profile or not authenticated
     */
    private Boolean isFollowing;
}
