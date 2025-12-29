package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.DailyVolumeDTO;
import com.gearfitness.gear_api.dto.WeeklyVolumeDTO;
import com.gearfitness.gear_api.dto.WorkoutDTO;
import com.gearfitness.gear_api.dto.WorkoutDetailDTO;
import com.gearfitness.gear_api.dto.WorkoutSubmissionDTO;
import com.gearfitness.gear_api.entity.Workout;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.WorkoutService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/workouts")
@RequiredArgsConstructor
public class WorkoutController {

    private final WorkoutService workoutService;
    private final JwtService jwtService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<WorkoutDTO>> getWorkoutsByUser(@PathVariable UUID userId) {
        try {
            List<WorkoutDTO> workouts = workoutService.getWorkoutsByUser(userId)
                    .stream()
                    .map(w -> new WorkoutDTO(
                            w.getWorkoutId(),
                            w.getName(),
                            w.getDatePerformed(),
                            w.getCreatedAt()))
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
                    saved.getDatePerformed(),
                    saved.getCreatedAt()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/submit")
    public ResponseEntity<WorkoutDetailDTO> submitWorkout(
            @RequestBody WorkoutSubmissionDTO submission,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.substring(7); // Remove "Bearer "
            UUID userId = jwtService.extractUserId(token);

            WorkoutDetailDTO workout = workoutService.submitWorkout(submission, userId);
            return ResponseEntity.ok(workout);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Weekly volume statistics
    @GetMapping("/user/{userId}/weekly-volume")
    public ResponseEntity<List<WeeklyVolumeDTO>> getWeeklyVolume(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "12") int weeks) {
        try {
            List<WeeklyVolumeDTO> weeklyVolume = workoutService.getWeeklyVolume(userId, weeks);
            return ResponseEntity.ok(weeklyVolume);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Daily volume statistics
    @GetMapping("/user/{userId}/daily-volume")
    public ResponseEntity<List<DailyVolumeDTO>> getDailyVolume(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "2") int weeks,
            @RequestParam(defaultValue = "SUNDAY") String weekStartDay) {
        try {
            DayOfWeek startDay = DayOfWeek.valueOf(weekStartDay.toUpperCase());
            List<DailyVolumeDTO> dailyVolume = workoutService.getDailyVolume(userId, weeks, startDay);
            return ResponseEntity.ok(dailyVolume);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
