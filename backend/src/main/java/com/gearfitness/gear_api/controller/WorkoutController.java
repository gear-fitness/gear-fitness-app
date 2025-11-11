package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.WorkoutDTO;
import com.gearfitness.gear_api.dto.WorkoutDetailDTO;
import com.gearfitness.gear_api.entity.Workout;
import com.gearfitness.gear_api.service.WorkoutService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
        try {
            List<WorkoutDTO> workouts = workoutService.getWorkoutsByUser(userId)
                    .stream()
                    .map(w -> new WorkoutDTO(
                            w.getWorkoutId(),
                            w.getName(),
                            w.getDatePerformed()
                    ))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(workouts);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{workoutId}")
    public ResponseEntity<WorkoutDetailDTO> getWorkoutDetails(@PathVariable UUID workoutId) {
        try {
            System.out.println("Fetching workout details for ID: " + workoutId);
            WorkoutDetailDTO details = workoutService.getWorkoutDetails(workoutId);
            return ResponseEntity.ok(details);
        } catch (RuntimeException e) {
            System.err.println("Error fetching workout: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            System.err.println("Unexpected error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping
    public ResponseEntity<WorkoutDTO> addWorkout(@RequestBody Workout workout) {
        try {
            Workout saved = workoutService.addWorkout(workout);
            return ResponseEntity.ok(new WorkoutDTO(
                    saved.getWorkoutId(),
                    saved.getName(),
                    saved.getDatePerformed()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
