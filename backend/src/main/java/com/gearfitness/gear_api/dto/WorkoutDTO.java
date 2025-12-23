package com.gearfitness.gear_api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
public class WorkoutDTO {
    private UUID workoutId;
    private String name;
    private LocalDate datePerformed;
    private LocalDateTime createdAt;
}
