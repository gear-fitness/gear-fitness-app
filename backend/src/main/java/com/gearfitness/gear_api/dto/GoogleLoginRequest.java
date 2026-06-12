package com.gearfitness.gear_api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GoogleLoginRequest {

  private String idToken;
  private String intent;
  private Boolean confirmRestore;

  private String username;
  private String displayName;
  private String gender;
  private Integer heightInches;
  private Integer weightLbs;
  private Integer age;
}
