package com.gearfitness.gear_api.controller;

// ✅ ADD ALL THESE IMPORTS BELOW
import com.gearfitness.gear_api.dto.WorkoutDTO;
import com.gearfitness.gear_api.entity.Workout;
import com.gearfitness.gear_api.service.WorkoutService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/workouts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WorkoutController {

    private final WorkoutService workoutService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<WorkoutDTO>> getWorkoutsByUser(@PathVariable UUID userId) {
        List<WorkoutDTO> workouts = workoutService.getWorkoutsByUser(userId)
                .stream()
                .map(w -> new WorkoutDTO(
                        w.getWorkoutId(),
                        w.getName(),
                        w.getDatePerformed()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(workouts);
    }

    @PostMapping
    public ResponseEntity<WorkoutDTO> addWorkout(@RequestBody Workout workout) {
        Workout saved = workoutService.addWorkout(workout);
        return ResponseEntity.ok(new WorkoutDTO(
                saved.getWorkoutId(),
                saved.getName(),
                saved.getDatePerformed()
        ));
    }
}
