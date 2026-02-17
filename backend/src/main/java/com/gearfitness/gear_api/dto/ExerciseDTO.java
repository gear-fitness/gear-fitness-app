package com.gearfitness.gear_api.dto;

import com.gearfitness.gear_api.entity.Exercise.BodyPart;
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
  private BodyPart bodyPart;
  private String description;
}
