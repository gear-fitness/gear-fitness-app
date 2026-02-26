package com.gearfitness.gear_api.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoutineExerciseDTO {
    private UUID routineExerciseId;
    private String exerciseName;
    private String bodyPart;
    private Integer position;
}