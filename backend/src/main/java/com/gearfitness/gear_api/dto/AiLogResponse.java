package com.gearfitness.gear_api.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of an AI food-logging request: the entries that were created, whether
 * they came from the cache (no paid Sonar call), the source URLs Sonar cited,
 * plus Sonar's short reasoning and 0-100 confidence for the estimate (surfaced
 * in the "Gear's thought process" panel of the nutrition-detail sheet).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiLogResponse {

  private List<LogEntryDTO> entries;
  private boolean fromCache;
  private List<String> sourceUrls;
  private String reasoning;
  private int confidence;
  // True when the parse recognized no food in the text (entries is empty and
  // nothing was logged). Lets the client show "no food recognized" instead of a
  // silent success. Distinct from an upstream error, which is a non-2xx response.
  private boolean noFood;
}
