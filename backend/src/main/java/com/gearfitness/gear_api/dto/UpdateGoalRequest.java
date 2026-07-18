package com.gearfitness.gear_api.dto;

import lombok.Data;

/** Manual override of a user's daily calorie & macro targets. */
@Data
public class UpdateGoalRequest {

  private Integer calorieGoal;
  private Integer proteinG;
  private Integer carbsG;
  private Integer fatG;
}
