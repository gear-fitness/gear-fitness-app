package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.DailyVolumeDTO;
import com.gearfitness.gear_api.dto.WeeklyVolumeDTO;
import com.gearfitness.gear_api.dto.WorkoutDTO;
import com.gearfitness.gear_api.dto.WorkoutDetailDTO;
import com.gearfitness.gear_api.dto.WorkoutSubmissionDTO;
import com.gearfitness.gear_api.entity.Workout;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.S3StorageService;
import com.gearfitness.gear_api.service.WorkoutService;
import java.time.DayOfWeek;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/workouts")
@RequiredArgsConstructor
public class WorkoutController {

  private final WorkoutService workoutService;
  private final JwtService jwtService;
  private final S3StorageService s3StorageService;

  @GetMapping("/user/{userId}")
  public ResponseEntity<List<WorkoutDTO>> getWorkoutsByUser(
    @PathVariable UUID userId
  ) {
    try {
      List<WorkoutDTO> workouts = workoutService
        .getWorkoutsByUser(userId)
        .stream()
        .map(w ->
          new WorkoutDTO(
            w.getWorkoutId(),
            w.getName(),
            w.getDatePerformed(),
            w.getCreatedAt(),
            w.getDurationMin(),
            w.getWorkoutExercises() == null
              ? 0
              : w.getWorkoutExercises().size(),
            w.getBodyTags() == null
              ? List.of()
              : w.getBodyTags().stream().map(Enum::name).toList()
          )
        )
        .collect(Collectors.toList());
      return ResponseEntity.ok(workouts);
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @GetMapping("/{workoutId}")
  public ResponseEntity<WorkoutDetailDTO> getWorkoutDetails(
    @PathVariable UUID workoutId,
    @RequestHeader(value = "Authorization", required = false) String authHeader
  ) {
    try {
      UUID requestingUserId = null;
      if (authHeader != null && authHeader.startsWith("Bearer ")) {
        String token = authHeader.substring(7);
        requestingUserId = jwtService.extractUserId(token);
      }

      WorkoutDetailDTO details = workoutService.getWorkoutDetails(
        workoutId,
        requestingUserId
      );
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
      return ResponseEntity.ok(
        new WorkoutDTO(
          saved.getWorkoutId(),
          saved.getName(),
          saved.getDatePerformed(),
          saved.getCreatedAt(),
          saved.getDurationMin(),
          saved.getWorkoutExercises() == null
            ? 0
            : saved.getWorkoutExercises().size(),
          saved.getBodyTags() == null
            ? List.of()
            : saved.getBodyTags().stream().map(Enum::name).toList()
        )
      );
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @PostMapping(
    value = "/photos",
    consumes = MediaType.MULTIPART_FORM_DATA_VALUE
  )
  public ResponseEntity<?> uploadWorkoutPhoto(
    @RequestHeader("Authorization") String authHeader,
    @RequestParam("file") MultipartFile file
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);

      String contentType = file.getContentType();
      Set<String> allowedTypes = Set.of("image/jpeg", "image/png");
      if (contentType == null || !allowedTypes.contains(contentType)) {
        return ResponseEntity.badRequest().body(
          "Only JPEG and PNG images are allowed"
        );
      }

      if (file.getSize() > 5 * 1024 * 1024) {
        return ResponseEntity.badRequest().body(
          "File size must not exceed 5MB"
        );
      }

      String url = s3StorageService.uploadWorkoutPhoto(
        userId,
        file.getBytes(),
        contentType
      );

      return ResponseEntity.ok(Map.of("url", url));
    } catch (Exception e) {
      System.err.println("Workout photo upload error: " + e.getMessage());
      e.printStackTrace();
      return ResponseEntity.internalServerError().body(
        "Failed to upload workout photo"
      );
    }
  }

  @PostMapping("/submit")
  public ResponseEntity<WorkoutDetailDTO> submitWorkout(
    @RequestBody WorkoutSubmissionDTO submission,
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7); // Remove "Bearer "
      UUID userId = jwtService.extractUserId(token);

      WorkoutDetailDTO workout = workoutService.submitWorkout(
        submission,
        userId
      );
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
    @RequestParam(defaultValue = "12") int weeks
  ) {
    try {
      List<WeeklyVolumeDTO> weeklyVolume = workoutService.getWeeklyVolume(
        userId,
        weeks
      );
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
    @RequestParam(defaultValue = "SUNDAY") String weekStartDay,
    @RequestParam(required = false) String localDate
  ) {
    try {
      DayOfWeek startDay = DayOfWeek.valueOf(weekStartDay.toUpperCase());
      List<DailyVolumeDTO> dailyVolume = workoutService.getDailyVolume(
        userId,
        weeks,
        startDay,
        localDate
      );
      return ResponseEntity.ok(dailyVolume);
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }


  @DeleteMapping("/{workoutId}")
  public ResponseEntity<Void> deleteWorkout(
    @PathVariable UUID workoutId,
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7); // Remove "Bearer "
      UUID userId = jwtService.extractUserId(token);

      workoutService.deleteWorkout(workoutId, userId);
      return ResponseEntity.noContent().build();
    } catch (IllegalArgumentException e) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }
}
