package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.SavedMeal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SavedMealRepository extends JpaRepository<SavedMeal, UUID> {
  List<SavedMeal> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
