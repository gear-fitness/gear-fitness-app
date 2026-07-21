package com.gearfitness.gear_api.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** One gym row in the Social tab's location search results. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationSummaryDTO {

  private UUID locationId;
  private String name;
  private String address;
  private Long postCount;
}
