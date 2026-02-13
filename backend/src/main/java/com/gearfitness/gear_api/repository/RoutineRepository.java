package com.gearfitness.gear_api.repository;

import java.util.UUID;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

import com.gearfitness.gear_api.entity.Routine;
@Repository
public interface RoutineRepository {
    List<Routine> findByUser_IdOrderByCreatedAtDesc(UUID userId);
    Optional<Routine> findByRoutineId(UUID routineId); //with entity graph for exercises
}
