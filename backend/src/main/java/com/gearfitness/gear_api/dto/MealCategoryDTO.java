package com.gearfitness.gear_api.dto;

import com.gearfitness.gear_api.entity.MealCategory;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MealCategoryDTO {

  private UUID categoryId;
  private String name;
  private int displayOrder;

  public static MealCategoryDTO from(MealCategory c) {
    return new MealCategoryDTO(c.getCategoryId(), c.getName(), c.getDisplayOrder());
  }
}
