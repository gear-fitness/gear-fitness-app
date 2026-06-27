package com.gearfitness.gear_api.dto;

import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkoutCardioDTO {

  private UUID workoutCardioId;
  private String activityType;
  private Integer durationSeconds;
  private BigDecimal distanceMeters;
  private Integer caloriesBurned;
  private BigDecimal intensityLevel;
  private String notes;
  private Integer position;
}
