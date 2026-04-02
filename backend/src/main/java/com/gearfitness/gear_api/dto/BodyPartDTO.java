package com.gearfitness.gear_api.dto;

import com.gearfitness.gear_api.entity.Exercise.BodyPart;
import com.gearfitness.gear_api.entity.ExerciseBodyPart.TargetType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BodyPartDTO {

  private BodyPart bodyPart;
  private TargetType targetType;
}
