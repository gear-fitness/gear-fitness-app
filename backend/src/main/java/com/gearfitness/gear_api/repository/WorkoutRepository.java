package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Workout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface WorkoutRepository extends JpaRepository<Workout, UUID> {

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
