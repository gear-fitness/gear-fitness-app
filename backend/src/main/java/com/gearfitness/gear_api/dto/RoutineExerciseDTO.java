package com.gearfitness.gear_api.dto;

import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoutineExerciseDTO {

  private UUID routineExerciseId;
  private String exerciseName;
  private List<BodyPartDTO> bodyParts;
  private Integer position;
  private UUID exerciseId;
}
