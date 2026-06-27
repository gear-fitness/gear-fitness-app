package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.MealCategory;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MealCategoryRepository extends JpaRepository<MealCategory, UUID> {

  List<MealCategory> findByUser_UserIdOrderByDisplayOrderAsc(UUID userId);

  Optional<MealCategory> findByUser_UserIdAndName(UUID userId, String name);

  @Query("SELECT COALESCE(MAX(c.displayOrder), -1) FROM MealCategory c WHERE c.user.userId = :userId")
  int findMaxDisplayOrderByUserId(@Param("userId") UUID userId);
}
