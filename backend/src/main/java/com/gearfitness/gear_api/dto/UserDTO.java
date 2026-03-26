package com.gearfitness.gear_api.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {

  private UUID userId;
  private String username;
  private String email;
  private Integer weightLbs;
  private Integer heightInches;
  private Integer age;
  private Boolean isPrivate;
  private String profilePictureUrl;
  private LocalDateTime createdAt;
}
