package com.gearfitness.gear_api.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateExerciseRequest {

  private String name;
  private String description;
  private List<BodyPartDTO> bodyParts;
}
