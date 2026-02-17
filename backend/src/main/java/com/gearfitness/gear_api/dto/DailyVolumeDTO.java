package com.gearfitness.gear_api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyVolumeDTO {
  private LocalDate date;
  private BigDecimal totalVolumeLbs;
  private Integer workoutCount;
}
