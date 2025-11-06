package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Workout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WorkoutRepository extends JpaRepository<Workout, UUID> {
    List<Workout> findByUser_UserId(UUID userId);
}
