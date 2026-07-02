package com.gearfitness.gear_api.dto;

import com.gearfitness.gear_api.entity.FoodItem;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A food search result. Nutrient values are per 100 g. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FoodItemDTO {

  private UUID foodId;
  private Long fdcId;
  private String description;
  private String brandOwner;
  private String dataType;
  private Double servingSize;
  private String servingUnit;
  private String householdServing;
  private Double calories;
  private Double proteinG;
  private Double carbsG;
  private Double fatG;

  public static FoodItemDTO from(FoodItem f) {
    return new FoodItemDTO(
      f.getFoodId(),
      f.getFdcId(),
      f.getDescription(),
      f.getBrandOwner(),
      f.getDataType(),
      f.getServingSize() == null ? null : f.getServingSize().doubleValue(),
      f.getServingUnit(),
      f.getHouseholdServing(),
      f.getCalories() == null ? null : f.getCalories().doubleValue(),
      f.getProteinG() == null ? null : f.getProteinG().doubleValue(),
      f.getCarbsG() == null ? null : f.getCarbsG().doubleValue(),
      f.getFatG() == null ? null : f.getFatG().doubleValue()
    );
  }
}
