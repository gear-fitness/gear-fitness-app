package com.gearfitness.gear_api.dto;

import java.util.List;
import lombok.Data;

/** Request to save a reusable meal: a name and its items. */
@Data
public class SaveMealRequest {

  private String name;
  private List<MealItemDTO> items;
}
