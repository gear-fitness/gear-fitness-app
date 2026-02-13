package com.gearfitness.gear_api.dto;
import java.util.UUID;
import java.util.List;

public class CreateRoutineFromWorkoutDTO {
    //Request DTO for creating a routine from a workout
    UUID workoutId;
    String name;
    List<String> scheduledDays;
}
