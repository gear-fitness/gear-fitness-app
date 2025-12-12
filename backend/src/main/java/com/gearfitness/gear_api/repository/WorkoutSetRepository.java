package com.gearfitness.gear_api.repository;

import java.util.UUID;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.gearfitness.gear_api.entity.WorkoutSet;

@Repository
public interface WorkoutSetRepository extends JpaRepository<WorkoutSet, UUID> {
    List<WorkoutSet> findByWorkoutExercise_WorkoutExerciseId(UUID workoutExerciseId);
}
