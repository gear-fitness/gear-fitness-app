package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.WorkoutSet;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkoutSetRepository extends JpaRepository<WorkoutSet, UUID> {
  List<WorkoutSet> findByWorkoutExercise_WorkoutExerciseId(
    UUID workoutExerciseId
  );

  @Query(
    """
    SELECT s
    FROM WorkoutSet s
      JOIN FETCH s.workoutExercise we
      JOIN FETCH we.workout w
    WHERE w.user.userId = :userId
      AND we.exercise.exerciseId = :exerciseId
    ORDER BY w.datePerformed ASC,
             w.createdAt ASC,
             we.position ASC,
             s.setNumber ASC
    """
  )
  List<WorkoutSet> findChronologicalForUserExercise(
    @Param("userId") UUID userId,
    @Param("exerciseId") UUID exerciseId
  );
}
