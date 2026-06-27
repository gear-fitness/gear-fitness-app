package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.WorkoutCardio;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkoutCardioRepository
  extends JpaRepository<WorkoutCardio, UUID> {}
