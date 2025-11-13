package com.gearfitness.gear_api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkoutSetDTO {

    private UUID workoutSetId;
    private UUID workoutExerciseId;  
    private Integer setNumber;
    private Integer reps;
    private Double weightLbs;       
}