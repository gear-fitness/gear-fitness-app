package com.gearfitness.gear_api.dto;

import java.util.UUID;

public class FollowerDTO {

  public UUID userId;
  public String username;
  public String profilePictureUrl;

  public FollowerDTO(UUID userId, String username) {
    this.userId = userId;
    this.username = username;
  }

  public FollowerDTO(UUID userId, String username, String profilePictureUrl) {
    this.userId = userId;
    this.username = username;
    this.profilePictureUrl = profilePictureUrl;
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
}
