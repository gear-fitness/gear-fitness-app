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
public class DailyVolumeDTO {
    private LocalDate date;
    private BigDecimal totalVolumeLbs;
    private Integer workoutCount;
}
