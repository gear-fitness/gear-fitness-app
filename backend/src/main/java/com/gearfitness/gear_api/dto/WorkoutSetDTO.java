package com.gearfitness.gear_api.dto;

import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkoutSetDTO {
  private UUID workoutSetId;
  private Integer setNumber;
  private Integer reps;
  private BigDecimal weightLbs; // Changed from weightKg to weightLbs
  private Boolean isPr;
}
