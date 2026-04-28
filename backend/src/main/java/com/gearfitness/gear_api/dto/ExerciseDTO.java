package com.gearfitness.gear_api.dto;

import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseDTO {

  private UUID exerciseId;
  private String name;
  private List<BodyPartDTO> bodyParts;
  private String description;
}
