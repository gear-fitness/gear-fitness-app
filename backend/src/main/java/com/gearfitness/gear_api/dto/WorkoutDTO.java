package com.gearfitness.gear_api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class WorkoutDTO {
  private UUID workoutId;
  private String name;
  private LocalDate datePerformed;
  private LocalDateTime createdAt;
}
