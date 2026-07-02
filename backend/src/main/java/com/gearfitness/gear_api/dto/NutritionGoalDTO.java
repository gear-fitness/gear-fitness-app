package com.gearfitness.gear_api.dto;

import com.gearfitness.gear_api.entity.NutritionGoal;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NutritionGoalDTO {

  private Integer calorieGoal;
  private Integer proteinG;
  private Integer carbsG;
  private Integer fatG;
  private Boolean isCustom;

  public static NutritionGoalDTO from(NutritionGoal g) {
    return new NutritionGoalDTO(
      g.getCalorieGoal(),
      g.getProteinG(),
      g.getCarbsG(),
      g.getFatG(),
      g.getIsCustom()
    );
  }
}
