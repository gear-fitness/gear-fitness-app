package com.gearfitness.gear_api.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A full day of nutrition: the goal, consumed totals, and logged entries. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DaySummaryDTO {

  private String date;
  private NutritionGoalDTO goal;
  private Totals totals;
  private List<LogEntryDTO> entries;

  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Totals {

    private double calories;
    private double proteinG;
    private double carbsG;
    private double fatG;
  }
}
