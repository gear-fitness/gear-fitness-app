package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.NutritionGoal;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NutritionGoalRepository
  extends JpaRepository<NutritionGoal, UUID>
{
  Optional<NutritionGoal> findByUser_UserId(UUID userId);
}
