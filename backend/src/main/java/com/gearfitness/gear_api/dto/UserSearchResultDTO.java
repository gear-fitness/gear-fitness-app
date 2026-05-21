package com.gearfitness.gear_api.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSearchResultDTO {

  private UUID userId;
  private String username;
  private String displayName;
  private String profilePictureUrl;
  private boolean followsCurrentUser;
  private boolean currentUserFollows;
}
