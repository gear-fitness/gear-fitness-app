package com.gearfitness.gear_api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of an AI nutrition estimate ("calculate calories for me"): the
 * summed macros of the parsed foods, WITHOUT logging anything. Backs the
 * custom-food creation form.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiEstimateResponse {

  private Double calories;
  private Double proteinG;
  private Double carbsG;
  private Double fatG;
  private int confidence;
  /** True when the parse recognized no food in the text. */
  private boolean noFood;
}
