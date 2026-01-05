package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Exercise;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {

    List<Exercise> findByBodyPart(Exercise.BodyPart bodyPart);

    Optional<Exercise> findByNameIgnoreCase(String name);
}
