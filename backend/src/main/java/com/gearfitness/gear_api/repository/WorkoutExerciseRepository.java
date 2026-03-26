package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.WorkoutExercise;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkoutExerciseRepository
  extends JpaRepository<WorkoutExercise, UUID>
{
  List<WorkoutExercise> findByWorkout_WorkoutId(UUID workoutId);

  List<
    WorkoutExercise
  > findByExercise_ExerciseIdAndWorkout_User_UserIdOrderByWorkout_DatePerformedDesc(
    UUID exerciseId,
    UUID userId
  );
}
