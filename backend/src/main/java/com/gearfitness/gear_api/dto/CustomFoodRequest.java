package com.gearfitness.gear_api.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Create/update payload for a user's custom food ("saved meal"). Nutrition is
 * per serving of the meal; macros are optional.
 */
@Data
@NoArgsConstructor
public class CustomFoodRequest {

  private String description;
  private String nickname;
  private Double calories;
  private Double proteinG;
  private Double carbsG;
  private Double fatG;
}
