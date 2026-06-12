package com.gearfitness.gear_api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppleLoginRequest {

  // Apple's signed JWT — verified server-side
  private String identityToken;

  // Apple's stable user identifier (sub claim from the JWT, also returned
  // separately by the SDK as `user`). Sent for convenience but we trust
  // the token's claim, not this field directly.
  private String appleUserId;

  // Provided by Apple ONLY on the user's first sign-in.
  private String email;

  // Same shape as GoogleLoginRequest
  private String intent;
  private Boolean confirmRestore;
  private Boolean confirmLink;

  // Onboarding profile (sign_up only)
  private String username;
  private String displayName;
  private String gender;
  private Integer heightInches;
  private Integer weightLbs;
  private Integer age;
}
