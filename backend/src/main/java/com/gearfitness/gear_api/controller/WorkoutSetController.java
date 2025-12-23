package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.entity.WorkoutSet;
import com.gearfitness.gear_api.repository.WorkoutSetRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workout-sets")
public class WorkoutSetController {

    private final WorkoutSetRepository workoutSetRepo;

    public WorkoutSetController(WorkoutSetRepository workoutSetRepo) {
        this.workoutSetRepo = workoutSetRepo;
    }

    @GetMapping("/exercise/{workoutExerciseId}")
    public ResponseEntity<List<WorkoutSet>> getSetsByWorkoutExercise(@PathVariable UUID workoutExerciseId) {
        List<WorkoutSet> sets = workoutSetRepo.findByWorkoutExercise_WorkoutExerciseId(workoutExerciseId);
        return ResponseEntity.ok(sets);
    }

    @PostMapping
    public ResponseEntity<WorkoutSet> addSet(@RequestBody WorkoutSet workoutSet) {
        WorkoutSet saved = workoutSetRepo.save(workoutSet);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSet(@PathVariable UUID id) {
        workoutSetRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
