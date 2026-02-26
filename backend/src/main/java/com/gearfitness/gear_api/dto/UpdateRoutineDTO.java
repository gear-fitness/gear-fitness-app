package com.gearfitness.gear_api.dto;

import java.util.List;
import java.time.DayOfWeek;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRoutineDTO {
    private String name;
    private List<DayOfWeek> scheduledDays;
}
