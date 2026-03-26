package com.gearfitness.gear_api.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ExerciseSessionDTO {

  private UUID workoutId;
  private String workoutName;
  private LocalDate datePerformed;
  private List<ExerciseSetDTO> sets;
}
