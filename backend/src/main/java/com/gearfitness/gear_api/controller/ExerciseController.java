package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.CreateExerciseRequest;
import com.gearfitness.gear_api.dto.ExerciseDTO;
import com.gearfitness.gear_api.dto.ExerciseHistoryDTO;
import com.gearfitness.gear_api.dto.ExerciseSessionDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Exercise;
import com.gearfitness.gear_api.dto.ExerciseSetDTO;
import com.gearfitness.gear_api.entity.WorkoutExercise;

import lombok.RequiredArgsConstructor;
import com.gearfitness.gear_api.repository.ExerciseRepository;
import com.gearfitness.gear_api.repository.WorkoutExerciseRepository;
import com.gearfitness.gear_api.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
public class ExerciseController {
        private final ExerciseRepository exerciseRepo;
        private final WorkoutExerciseRepository workoutExerciseRepo;
        private final JwtService jwtService;

        @GetMapping
        public List<ExerciseDTO> getAllExercises(@RequestHeader("Authorization") String authHeader) {
                UUID userId = jwtService.extractUserId(authHeader.substring(7));

                return exerciseRepo.findByUserIsNullOrUserUserId(userId).stream()
                                .map(ex -> new ExerciseDTO(
                                                ex.getExerciseId(),
                                                ex.getName(),
                                                ex.getBodyPart(),
                                                ex.getDescription()))
                                .toList();
        }

        @GetMapping("/filter")
        public List<ExerciseDTO> getByBodyPart(@RequestParam Exercise.BodyPart bodyPart) {
                return exerciseRepo.findByBodyPart(bodyPart).stream()
                                .map(ex -> new ExerciseDTO(
                                                ex.getExerciseId(),
                                                ex.getName(),
                                                ex.getBodyPart(),
                                                ex.getDescription()))
                                .toList();
        }

        @Transactional(readOnly = true)
        @GetMapping("/{exerciseId}/history")
        public ResponseEntity<ExerciseHistoryDTO> getExerciseHistory(
                        @PathVariable UUID exerciseId,
                        @RequestHeader("Authorization") String authHeader) {
                System.out.println("=== History endpoint hit for: " + exerciseId);

                try {
                        String token = authHeader.substring(7);
                        UUID userId = jwtService.extractUserId(token);

                        // Fetch all times this user performed this exercise
                        List<WorkoutExercise> workoutExercises = workoutExerciseRepo
                                        .findByExercise_ExerciseIdAndWorkout_User_UserIdOrderByWorkout_DatePerformedDesc(
                                                        exerciseId, userId);

                        // Build session DTOs
                        List<ExerciseSessionDTO> sessions = workoutExercises.stream()
                                        .map(we -> new ExerciseSessionDTO(
                                                        we.getWorkout().getWorkoutId(),
                                                        we.getWorkout().getName(),
                                                        we.getWorkout().getDatePerformed(),
                                                        we.getWorkoutSets().stream()
                                                                        .map(s -> new ExerciseSetDTO(
                                                                                        s.getSetNumber(),
                                                                                        s.getReps(),
                                                                                        s.getWeightLbs(),
                                                                                        s.getIsPr()))
                                                                        .toList()))
                                        .toList();

                        // Find personal record (highest weight across all sets)
                        BigDecimal pr = workoutExercises.stream()
                                        .flatMap(we -> we.getWorkoutSets().stream())
                                        .map(s -> s.getWeightLbs())
                                        .filter(w -> w != null)
                                        .max(BigDecimal::compareTo)
                                        .orElse(null);

                        // Get exercise info from first result, or look it up
                        String exerciseName;
                        String bodyPart;
                        if (!workoutExercises.isEmpty()) {
                                Exercise ex = workoutExercises.get(0).getExercise();
                                exerciseName = ex.getName();
                                bodyPart = ex.getBodyPart().name();
                        } else {
                                Exercise ex = exerciseRepo.findById(exerciseId)
                                                .orElseThrow(() -> new RuntimeException("Exercise not found"));
                                exerciseName = ex.getName();
                                bodyPart = ex.getBodyPart().name();
                        }

                        ExerciseHistoryDTO dto = new ExerciseHistoryDTO(
                                        exerciseId,
                                        exerciseName,
                                        bodyPart,
                                        sessions.size(),
                                        pr,
                                        sessions);

                        return ResponseEntity.ok(dto);

                } catch (RuntimeException e) {
                        System.err.println("=== RuntimeException: " + e.getMessage());
                        e.printStackTrace();
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
                } catch (Exception e) {
                        e.printStackTrace();
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
                }
        }

        @PostMapping
        public ExerciseDTO createExercise(@RequestHeader("Authorization") String authHeader,
                        @RequestBody CreateExerciseRequest request) {
                UUID userId = jwtService.extractUserId(authHeader.substring(7));

                AppUser user = new AppUser();
                user.setUserId(userId);

                Exercise exercise = Exercise.builder()
                                .name(request.name())
                                .description(request.description())
                                .bodyPart(Exercise.BodyPart.valueOf(request.bodyPart()))
                                .user(user)
                                .build();
                Exercise saved = exerciseRepo.save(exercise);

                return new ExerciseDTO(
                                saved.getExerciseId(),
                                saved.getName(),
                                saved.getBodyPart(),
                                saved.getDescription());
        }

        @DeleteMapping("/{exerciseId}")
        public ResponseEntity<?> deleteExercise(@RequestHeader("Authorization") String authHeader,
                        @PathVariable UUID exerciseId) {

                UUID userId = jwtService.extractUserId(authHeader.substring(7));
                Exercise exercise = exerciseRepo.findById(exerciseId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

                if (exercise.getUser() == null || !exercise.getUser().getUserId().equals(userId)) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot delete this exercise");

                }

                exerciseRepo.delete(exercise);
                return ResponseEntity.ok().build();

        }
}
