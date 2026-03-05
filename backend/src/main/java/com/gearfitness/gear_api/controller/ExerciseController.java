package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.CreateExerciseRequest;
import com.gearfitness.gear_api.dto.ExerciseDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Exercise;
import lombok.RequiredArgsConstructor;
import com.gearfitness.gear_api.repository.ExerciseRepository;
import com.gearfitness.gear_api.security.JwtService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
public class ExerciseController {

    private final ExerciseRepository exerciseRepo;
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

}
