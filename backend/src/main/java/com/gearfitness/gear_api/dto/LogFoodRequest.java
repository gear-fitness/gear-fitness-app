package com.gearfitness.gear_api.dto;

import java.util.UUID;
import lombok.Data;

/**
 * Request to log a food. Either {@code foodId} references a seeded food (macros
 * are computed from it and {@code quantity}/{@code unit}), or it is null for a
 * quick-add, in which case the snapshot macro fields are used directly.
 */
@Data
public class LogFoodRequest {

  private UUID foodId;
  private String category; // visual card label, e.g. "Breakfast"
  private String date; // YYYY-MM-DD
  private Double quantity;
  private String unit; // SERVING | GRAM

  // Quick-add snapshot (used when foodId is null).
  private String description;
  private Double calories;
  private Double proteinG;
  private Double carbsG;
  private Double fatG;

  // Provenance for AI-logged entries; null for manual/quick-add.
  private String sourceType; // AI_SONAR | AI_CACHE | null
  private String sourceUrl;
}
