package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Exercise;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {
  @Query(
    "SELECT DISTINCT e FROM Exercise e JOIN e.bodyParts bp " +
      "WHERE bp.bodyPart = :bodyPart"
  )
  List<Exercise> findByBodyPart(@Param("bodyPart") Exercise.BodyPart bodyPart);

  List<Exercise> findByUserIsNullOrUserUserId(UUID userId);
}
