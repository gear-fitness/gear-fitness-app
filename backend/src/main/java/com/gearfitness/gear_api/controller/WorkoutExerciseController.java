package com.gearfitness.gear_api.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gearfitness.gear_api.entity.WorkoutExercise;
import com.gearfitness.gear_api.repository.WorkoutExerciseRepository;

@RestController
@RequestMapping("/api/workout-exercises")
@CrossOrigin(origins = "*")

public class WorkoutExerciseController {

    private final WorkoutExerciseRepository workoutExerciseRepo;

    public WorkoutExerciseController(WorkoutExerciseRepository workoutExerciseRepo) {
        this.workoutExerciseRepo = workoutExerciseRepo;
    }
    
    @GetMapping("/workout/{workoutId}")
    public ResponseEntity<List<WorkoutExercise>> getExercisesByWorkout(@PathVariable UUID workoutId) {
        List<WorkoutExercise> exercises = workoutExerciseRepo.findByWorkout_WorkoutId(workoutId);
        return ResponseEntity.ok(exercises);
    }

    @PostMapping
    public WorkoutExercise addWorkoutExercise(@RequestBody WorkoutExercise workoutExercise) {
        return workoutExerciseRepo.save(workoutExercise);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkoutExercise(@PathVariable UUID id) {
        workoutExerciseRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

}
