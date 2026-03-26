package com.gearfitness.gear_api.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutDetailDTO {

  private UUID workoutId;
  private String name;
  private LocalDate datePerformed;
  private Integer durationMin;
  private String bodyTag;
  private List<WorkoutExerciseDTO> exercises;
}
