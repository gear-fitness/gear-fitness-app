package com.gearfitness.gear_api.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One gym in the location picker's search results. Field-for-field compatible
 * with WorkoutSubmissionDTO.LocationSubmissionDTO so the client can pass a
 * picked result straight into the workout submission.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationSearchResultDTO {

  private String googlePlaceId; // null for locally-stored manual gyms
  private String name;
  private String address;
  private BigDecimal latitude;
  private BigDecimal longitude;
}
