package com.gearfitness.gear_api.dto;

import java.util.UUID;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoutineFromWorkoutDTO {
    private UUID workoutId;
    private String name;
    private List<String> scheduledDays;
}
