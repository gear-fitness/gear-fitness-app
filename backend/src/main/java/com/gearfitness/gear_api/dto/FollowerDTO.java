package com.gearfitness.gear_api.dto;

import java.util.UUID;

public class FollowerDTO {

  public UUID userId;
  public String username;
  private String displayName;
  public String profilePictureUrl;
  public boolean isFollowing;

  public FollowerDTO(
    UUID userId,
    String username,
    String displayName,
    String profilePictureUrl
  ) {
    this.userId = userId;
    this.username = username;
    this.displayName = displayName;
    this.profilePictureUrl = profilePictureUrl;
  }

  public FollowerDTO(
    UUID userId,
    String username,
    String displayName,
    String profilePictureUrl,
    boolean isFollowing
  ) {
    this.userId = userId;
    this.username = username;
    this.displayName = displayName;
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

  public String getDisplayName() {
    return displayName;
  }

  public boolean isFollowing() {
    return isFollowing;
  }
}
