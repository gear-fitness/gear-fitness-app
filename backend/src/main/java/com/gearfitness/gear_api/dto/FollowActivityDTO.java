package com.gearfitness.gear_api.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class FollowActivityDTO {

    private UUID userId;
    private String username;
    private String profilePictureUrl;
    private LocalDateTime createdAt;

    public FollowActivityDTO(UUID userId, String username, String profilePictureUrl, LocalDateTime createdAt) {
        this.userId = userId;
        this.username = username;
        this.profilePictureUrl = profilePictureUrl;
        this.createdAt = createdAt;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }

    public String getProfilePictureUrl() {
        return profilePictureUrl;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
