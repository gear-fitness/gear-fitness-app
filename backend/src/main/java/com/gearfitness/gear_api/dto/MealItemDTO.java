package com.gearfitness.gear_api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** One item within a saved meal: a description plus its macros. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MealItemDTO {

  private String name;
  private double calories;
  private double proteinG;
  private double carbsG;
  private double fatG;
}
