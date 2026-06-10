package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.BodyPartDTO;
import com.gearfitness.gear_api.dto.CreateExerciseRequest;
import com.gearfitness.gear_api.dto.ExerciseDTO;
import com.gearfitness.gear_api.dto.ExerciseHistoryDTO;
import com.gearfitness.gear_api.dto.ExerciseSessionDTO;
import com.gearfitness.gear_api.dto.ExerciseSetDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Exercise;
import com.gearfitness.gear_api.entity.ExerciseBodyPart;
import com.gearfitness.gear_api.entity.MuscleGroup;
import com.gearfitness.gear_api.entity.WorkoutExercise;
import com.gearfitness.gear_api.repository.ExerciseRepository;
import com.gearfitness.gear_api.repository.WorkoutExerciseRepository;
import com.gearfitness.gear_api.security.JwtService;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
public class ExerciseController {

  private final ExerciseRepository exerciseRepo;
  private final WorkoutExerciseRepository workoutExerciseRepo;
  private final JwtService jwtService;

  @GetMapping
  public List<ExerciseDTO> getAllExercises(
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));

    return exerciseRepo
      .findByUserIsNullOrUserUserId(userId)
      .stream()
      .map(this::toDTO)
      .toList();
  }

  @GetMapping("/filter")
  public List<ExerciseDTO> getByBodyPart(@RequestParam MuscleGroup bodyPart) {
    return exerciseRepo
      .findByBodyPart(bodyPart)
      .stream()
      .map(this::toDTO)
      .toList();
  }

  @Transactional(readOnly = true)
  @GetMapping("/{exerciseId}/history")
  public ResponseEntity<ExerciseHistoryDTO> getExerciseHistory(
    @PathVariable UUID exerciseId,
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);

      List<WorkoutExercise> workoutExercises =
        workoutExerciseRepo.findByExercise_ExerciseIdAndWorkout_User_UserIdOrderByWorkout_DatePerformedDesc(
          exerciseId,
          userId
        );

      Exercise exercise;
      if (!workoutExercises.isEmpty()) {
        exercise = workoutExercises.get(0).getExercise();
      } else {
        exercise = exerciseRepo
          .findById(exerciseId)
          .orElseThrow(() -> new RuntimeException("Exercise not found"));
      }

      return ResponseEntity.ok(
        buildHistoryDTO(exerciseId, exercise, workoutExercises)
      );
    } catch (RuntimeException e) {
      System.err.println("=== RuntimeException: " + e.getMessage());
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @Transactional(readOnly = true)
  @GetMapping("/history/all")
  public ResponseEntity<List<ExerciseHistoryDTO>> getAllExerciseHistory(
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);

      List<WorkoutExercise> all =
        workoutExerciseRepo.findByWorkout_User_UserIdOrderByWorkout_DatePerformedDesc(
          userId
        );

      // Preserve date-desc order: LinkedHashMap keeps first-seen insertion order,
      // which matches the per-exercise endpoint (newest session first).
      Map<UUID, List<WorkoutExercise>> byExercise = new LinkedHashMap<>();
      for (WorkoutExercise we : all) {
        byExercise
          .computeIfAbsent(we.getExercise().getExerciseId(), k -> new java.util.ArrayList<>())
          .add(we);
      }

      List<ExerciseHistoryDTO> result = byExercise
        .entrySet()
        .stream()
        .map(entry -> {
          UUID exerciseId = entry.getKey();
          List<WorkoutExercise> rows = entry.getValue();
          Exercise exercise = rows.get(0).getExercise();
          return buildHistoryDTO(exerciseId, exercise, rows);
        })
        .toList();

      return ResponseEntity.ok(result);
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  private ExerciseHistoryDTO buildHistoryDTO(
    UUID exerciseId,
    Exercise exercise,
    List<WorkoutExercise> workoutExercises
  ) {
    List<ExerciseSessionDTO> sessions = workoutExercises
      .stream()
      .map(we ->
        new ExerciseSessionDTO(
          we.getWorkout().getWorkoutId(),
          we.getWorkout().getName(),
          we.getWorkout().getDatePerformed(),
          we
            .getWorkoutSets()
            .stream()
            .map(s ->
              new ExerciseSetDTO(
                s.getSetNumber(),
                s.getReps(),
                s.getWeightLbs(),
                s.getIsPr()
              )
            )
            .toList()
        )
      )
      .toList();

    BigDecimal pr = workoutExercises
      .stream()
      .flatMap(we -> we.getWorkoutSets().stream())
      .map(s -> s.getWeightLbs())
      .filter(w -> w != null)
      .max(BigDecimal::compareTo)
      .orElse(null);

    List<BodyPartDTO> bodyPartDTOs = exercise
      .getBodyParts()
      .stream()
      .map(bp -> new BodyPartDTO(bp.getBodyPart(), bp.getTargetType()))
      .toList();

    return new ExerciseHistoryDTO(
      exerciseId,
      exercise.getName(),
      bodyPartDTOs,
      sessions.size(),
      pr,
      sessions
    );
  }

  @PostMapping
  public ExerciseDTO createExercise(
    @RequestHeader("Authorization") String authHeader,
    @RequestBody CreateExerciseRequest request
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));

    AppUser user = new AppUser();
    user.setUserId(userId);

    Set<ExerciseBodyPart> bodyParts = request
      .getBodyParts()
      .stream()
      .map(bp -> new ExerciseBodyPart(bp.getBodyPart(), bp.getTargetType()))
      .collect(Collectors.toSet());

    Exercise exercise = Exercise.builder()
      .name(request.getName())
      .description(request.getDescription())
      .bodyParts(bodyParts)
      .user(user)
      .build();

    Exercise saved = exerciseRepo.save(exercise);

    return toDTO(saved);
  }

  @DeleteMapping("/{exerciseId}")
  public ResponseEntity<?> deleteExercise(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID exerciseId
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    Exercise exercise = exerciseRepo
      .findById(exerciseId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

    if (
      exercise.getUser() == null ||
      !exercise.getUser().getUserId().equals(userId)
    ) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "Cannot delete this exercise"
      );
    }

    exerciseRepo.delete(exercise);
    return ResponseEntity.ok().build();
  }

  private ExerciseDTO toDTO(Exercise ex) {
    List<BodyPartDTO> bodyPartDTOs = ex
      .getBodyParts()
      .stream()
      .map(bp -> new BodyPartDTO(bp.getBodyPart(), bp.getTargetType()))
      .toList();

    return new ExerciseDTO(
      ex.getExerciseId(),
      ex.getName(),
      bodyPartDTOs,
      ex.getDescription()
    );
  }
}
