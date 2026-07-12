package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.LocationSearchCache;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LocationSearchCacheRepository
  extends JpaRepository<LocationSearchCache, UUID>
{
  Optional<LocationSearchCache> findByCacheKey(String cacheKey);

  // Cache rows are only created on a Places cache miss, so counting rows
  // created this month is a proxy for the number of paid calls (spend guard).
  long countByCreatedAtAfter(LocalDateTime start);
}
