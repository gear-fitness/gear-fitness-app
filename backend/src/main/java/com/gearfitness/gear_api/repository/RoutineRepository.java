package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Routine;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RoutineRepository extends JpaRepository<Routine, UUID> {
  List<Routine> findByUser_UserIdOrderByCreatedAtDesc(UUID userId);

  @EntityGraph(
    attributePaths = { "routineExercises", "routineExercises.exercise" }
  )
  @Query("SELECT r FROM Routine r WHERE r.routineId = :routineId")
  Optional<Routine> findByRoutineId(@Param("routineId") UUID routineId);
}
