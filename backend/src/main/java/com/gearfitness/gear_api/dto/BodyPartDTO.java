package com.gearfitness.gear_api.dto;

import com.gearfitness.gear_api.entity.ExerciseBodyPart.TargetType;
import com.gearfitness.gear_api.entity.MuscleGroup;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BodyPartDTO {

  private MuscleGroup bodyPart;
  private TargetType targetType;
}
