package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.NutritionCache;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NutritionCacheRepository
  extends JpaRepository<NutritionCache, UUID> {
  Optional<NutritionCache> findByNormalizedKey(String normalizedKey);

  // Cache rows are only created on a Sonar cache miss, so counting rows created
  // this month is a proxy for the number of paid Sonar calls (spend guard).
  long countByCreatedAtAfter(LocalDateTime start);
}
