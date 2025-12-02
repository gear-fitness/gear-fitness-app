package com.gearfitness.gear_api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PersonalRecordDTO {
    private String exerciseName;
    private BigDecimal maxWeight;
    private Integer repsAtMaxWeight;
    private LocalDate dateAchieved;
    private String workoutName;
}
