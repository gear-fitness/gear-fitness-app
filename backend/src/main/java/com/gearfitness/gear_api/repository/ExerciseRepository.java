package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Exercise;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {
  List<Exercise> findByBodyPart(Exercise.BodyPart bodyPart);
  List<Exercise> findByUserIsNullOrUserUserId(UUID userId);
  List<Exercise> findByUserUserId(UUID userId);
}
