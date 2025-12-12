package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Exercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {
    List<Exercise> findByBodyPart(Exercise.BodyPart bodyPart);
}
