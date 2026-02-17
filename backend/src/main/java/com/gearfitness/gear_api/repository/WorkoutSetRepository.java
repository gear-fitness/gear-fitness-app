package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.WorkoutSet;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkoutSetRepository extends JpaRepository<WorkoutSet, UUID> {
  List<WorkoutSet> findByWorkoutExercise_WorkoutExerciseId(UUID workoutExerciseId);
}
