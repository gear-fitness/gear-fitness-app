package com.gearfitness.gear_api.dto;

import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A saved meal returned to the client: id, name, and its items. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SavedMealDTO {

  private UUID mealId;
  private String name;
  private List<MealItemDTO> items;
}
