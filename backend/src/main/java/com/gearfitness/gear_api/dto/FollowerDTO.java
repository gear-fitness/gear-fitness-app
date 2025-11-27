package com.gearfitness.gear_api.dto;

import java.util.UUID;

public class FollowerDTO {
    public UUID userId;
    public String username;

    public FollowerDTO(UUID userId, String username) {
        this.userId = userId;
        this.username = username;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }
}
