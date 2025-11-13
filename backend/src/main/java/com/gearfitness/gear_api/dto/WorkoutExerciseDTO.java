package com.gearfitness.gear_api.dto;

import java.util.Set;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkoutExerciseDTO {
    private UUID workoutExerciseId;   
    private UUID exerciseId;          
    private String exerciseName;      
    private String note;              
    private Integer position;         
    private Set<WorkoutSetDTO> workoutSets; 
}

