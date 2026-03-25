package com.gearfitness.gear_api.repository;

import java.util.UUID;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;
import com.gearfitness.gear_api.entity.Routine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface RoutineRepository extends JpaRepository<Routine, UUID> {
    List<Routine> findByUser_UserIdOrderByCreatedAtDesc(UUID userId);

    @EntityGraph(attributePaths = { "routineExercises", "routineExercises.exercise" })
    @Query("SELECT r FROM Routine r WHERE r.routineId = :routineId")
    Optional<Routine> findByRoutineId(@Param("routineId") UUID routineId);
}
