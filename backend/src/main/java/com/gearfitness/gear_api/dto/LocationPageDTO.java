package com.gearfitness.gear_api.dto;

import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Header data for a gym's location page: identity plus visible-post stats. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationPageDTO {

  private UUID locationId;
  private String name;
  private String address;
  private BigDecimal latitude;
  private BigDecimal longitude;
  private Long postCount;
  private Long athleteCount;
}
