package com.gearfitness.gear_api.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ExerciseSetDTO {

  private Integer setNumber;
  private Integer reps;
  private BigDecimal weightLbs;
  private Boolean isPr;
}
