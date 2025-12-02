package com.gearfitness.gear_api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkoutExerciseDTO {
    private UUID workoutExerciseId;
    private String exerciseName;
    private String bodyPart;
    private Integer position;
    private String note;
    private List<WorkoutSetDTO> sets;
}