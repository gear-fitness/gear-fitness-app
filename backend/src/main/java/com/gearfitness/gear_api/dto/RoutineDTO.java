package com.gearfitness.gear_api.dto;
import java.time.DayOfWeek;
import java.util.List;
import java.time.LocalDateTime;
import java.util.UUID;

public class RoutineDTO {
    //Response DTO for Routine entity
    UUID RoutineId;
    String name;
    List<DayOfWeek> scheduledDays;
    LocalDateTime createdAt;
    List<RoutineExerciseDTO> exercises;
}
