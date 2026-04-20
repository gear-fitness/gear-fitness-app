package com.gearfitness.gear_api.dto;

import java.util.UUID;

public class FollowerDTO {

  public UUID userId;
  public String username;
  public String profilePictureUrl;
  public boolean isFollowing;

  public FollowerDTO(UUID userId, String username) {
    this.userId = userId;
    this.username = username;
  }

  public FollowerDTO(UUID userId, String username, String profilePictureUrl) {
    this.userId = userId;
    this.username = username;
    this.profilePictureUrl = profilePictureUrl;
  }

  public FollowerDTO(
    UUID userId,
    String username,
    String profilePictureUrl,
    boolean isFollowing
  ) {
    this.userId = userId;
    this.username = username;
    this.profilePictureUrl = profilePictureUrl;
    this.isFollowing = isFollowing;
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

  public boolean isFollowing() {
    return isFollowing;
  }
}
