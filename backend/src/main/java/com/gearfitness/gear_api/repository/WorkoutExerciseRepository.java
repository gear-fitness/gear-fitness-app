package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.WorkoutExercise;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface WorkoutExerciseRepository extends JpaRepository<WorkoutExercise, UUID> {
     List<WorkoutExercise> findByWorkout_WorkoutId(UUID workoutId);
}
