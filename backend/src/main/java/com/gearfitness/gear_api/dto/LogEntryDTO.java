package com.gearfitness.gear_api.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gearfitness.gear_api.entity.FoodLogEntry;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LogEntryDTO {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private UUID entryId;
  private UUID foodId;
  private String category;
  private String description;
  private Double quantity;
  private String unit;
  private Double calories;
  private Double proteinG;
  private Double carbsG;
  private Double fatG;
  private String sourceType;
  private String sourceUrl;
  private JsonNode displayMeta;

  public static LogEntryDTO from(FoodLogEntry e) {
    return new LogEntryDTO(
      e.getEntryId(),
      e.getFood() == null ? null : e.getFood().getFoodId(),
      e.getCategory(),
      e.getDescription(),
      e.getQuantity() == null ? null : e.getQuantity().doubleValue(),
      e.getUnit().name(),
      e.getCalories() == null ? null : e.getCalories().doubleValue(),
      e.getProteinG() == null ? null : e.getProteinG().doubleValue(),
      e.getCarbsG() == null ? null : e.getCarbsG().doubleValue(),
      e.getFatG() == null ? null : e.getFatG().doubleValue(),
      e.getSourceType(),
      e.getSourceUrl(),
      parseJson(e.getDisplayMeta())
    );
  }

  // The column is jsonb, so stored values are always parseable; a null column
  // stays null in the DTO.
  private static JsonNode parseJson(String raw) {
    if (raw == null) return null;
    try {
      return MAPPER.readTree(raw);
    } catch (Exception ex) {
      return null;
    }
  }
}
