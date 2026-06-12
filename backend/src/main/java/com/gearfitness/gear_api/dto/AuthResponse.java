package com.gearfitness.gear_api.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

  private String token;
  private String refreshToken;
  private UserDTO user;
  private boolean newUser;
  private String error;
  private String errorCode;
  private Boolean accountPendingDeletion;
  private LocalDateTime deletedAt;
  private Boolean accountExistsForLinking;
  private String existingProvider;
}
