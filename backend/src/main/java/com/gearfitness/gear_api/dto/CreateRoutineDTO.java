package com.gearfitness.gear_api.dto;

import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoutineDTO {

  private String name;
  private List<String> scheduledDays;
  private List<UUID> exerciseIds;

  // Optional - superset-aware clients send this alongside exerciseIds.
  // When present it wins; exerciseIds stays supported forever.
  private List<RoutineExerciseEntryDTO> exercises;
}
