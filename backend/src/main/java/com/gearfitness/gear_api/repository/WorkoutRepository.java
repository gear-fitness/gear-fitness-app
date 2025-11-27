package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Workout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
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

    /**
     * Count total workouts for a user
     */
    long countByUser(AppUser user);

    /**
     * Count workouts for a user within a date range
     */
    long countByUserAndDatePerformedBetween(AppUser user, LocalDate startDate, LocalDate endDate);

    /**
     * Find all workouts for a user within a date range
     */
    List<Workout> findByUserAndDatePerformedBetween(AppUser user, LocalDate startDate, LocalDate endDate);

    /**
     * Find all workouts for a user ordered by date
     */
    List<Workout> findByUserOrderByDatePerformedDesc(AppUser user);
}