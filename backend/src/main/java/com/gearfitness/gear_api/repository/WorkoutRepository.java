package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Workout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkoutRepository extends JpaRepository<Workout, UUID> {
    
    List<Workout> findByUser_UserId(UUID userId);
    
    @EntityGraph(attributePaths = {
        "workoutExercises",
        "workoutExercises.exercise",
        "workoutExercises.workoutSets"
    })
    @Query("SELECT w FROM Workout w WHERE w.workoutId = :workoutId")
    Optional<Workout> findByIdWithDetails(@Param("workoutId") UUID workoutId);
    
    @Override
    @EntityGraph(attributePaths = {
        "workoutExercises",
        "workoutExercises.exercise",
        "workoutExercises.workoutSets"
    })
    Optional<Workout> findById(UUID workoutId);
}