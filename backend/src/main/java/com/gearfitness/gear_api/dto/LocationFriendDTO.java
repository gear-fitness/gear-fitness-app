package com.gearfitness.gear_api.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One person the viewer follows who has at least one post at this gym the
 * viewer is permitted to see. Viewer-specific: computed against the caller's
 * follow graph and post-visibility rules, never cacheable across users.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationFriendDTO {

  private UUID userId;
  private String username;
  private String displayName;
  private String profilePictureUrl;
}
