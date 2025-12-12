package com.gearfitness.gear_api.service;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

import com.gearfitness.gear_api.entity.WorkoutExercise;
import com.gearfitness.gear_api.repository.WorkoutExerciseRepository;
public class WorkoutExerciseService {

    private final WorkoutExerciseRepository workoutExerciseRepo;

    @Autowired
    public WorkoutExerciseService(WorkoutExerciseRepository workoutExerciseRepo) {
        this.workoutExerciseRepo = workoutExerciseRepo;
    }

@PatchMapping("/{id}")
public ResponseEntity<WorkoutExercise> updateWorkoutExercise(
        @PathVariable UUID id,
        @RequestBody WorkoutExercise updatedExercise) {

    return workoutExerciseRepo.findById(id)
        .map(existing -> {
            if (updatedExercise.getNote() != null) {
                existing.setNote(updatedExercise.getNote());
            }
            if (updatedExercise.getPosition() != null) {
                existing.setPosition(updatedExercise.getPosition());
            }

            WorkoutExercise saved = workoutExerciseRepo.save(existing);
            return ResponseEntity.ok(saved);
        })
        .orElseGet(() -> ResponseEntity.notFound().build());
}
    
}
    
