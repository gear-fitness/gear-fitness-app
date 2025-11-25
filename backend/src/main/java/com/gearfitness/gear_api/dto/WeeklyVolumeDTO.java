package com.gearfitness.gear_api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeeklyVolumeDTO {
    private LocalDate weekStartDate;
    private LocalDate weekEndDate;
    private BigDecimal totalVolumeLbs;
    private Integer workoutCount;
}
