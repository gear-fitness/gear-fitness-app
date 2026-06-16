package com.gearfitness.gear_api.dto;

import java.util.UUID;

public class FollowerDTO {

  public UUID userId;
  public String username;
  private String displayName;
  public String profilePictureUrl;
  public boolean isFollowing;

  /**
   * Current viewer's relationship toward this user: "ACCEPTED", "PENDING",
   * "BLOCKED", or "NONE". Drives the follow button's Follow / Requested /
   * Following states.
   */
  public String followStatus;

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
    String followStatus
  ) {
    this.userId = userId;
    this.username = username;
    this.displayName = displayName;
    this.profilePictureUrl = profilePictureUrl;
    this.followStatus = followStatus;
    this.isFollowing = "ACCEPTED".equals(followStatus);
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

  public String getFollowStatus() {
    return followStatus;
  }
}
