package com.gearfitness.gear_api.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class FollowActivityDTO {

    private UUID userId;
    private String username;
    private LocalDateTime createdAt;

    public FollowActivityDTO(UUID userId, String username, LocalDateTime createdAt) {
        this.userId = userId;
        this.username = username;
        this.createdAt = createdAt;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
