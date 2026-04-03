package com.gearfitness.gear_api.dto;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoutineDTO {

  // Response DTO for Routine entity
  private UUID routineId;
  private String name;
  private List<DayOfWeek> scheduledDays;
  private LocalDateTime createdAt;
  private List<RoutineExerciseDTO> exercises;
}
