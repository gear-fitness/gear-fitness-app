package com.gearfitness.gear_api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Optional body for POST /nutrition/goal/recalculate. Both fields are
 * optional; omitted fields leave the stored values untouched.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecalculateGoalRequest {

  private String goalType; // Optional: CUT | MAINTAIN | BULK
  private String goalIntensity; // Optional: SLOW | MODERATE | AGGRESSIVE
}
