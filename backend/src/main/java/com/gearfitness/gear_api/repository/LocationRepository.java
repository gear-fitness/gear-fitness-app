package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Location;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LocationRepository extends JpaRepository<Location, UUID> {
  Optional<Location> findByGooglePlaceId(String googlePlaceId);

  Optional<Location> findFirstByGooglePlaceIdIsNullAndNameIgnoreCase(
    String name
  );

  /**
   * Local-DB gym name search — the fallback when the Places API is
   * unconfigured, over its spend caps, or failing. Native so it can use the
   * pg_trgm GIN index on LOWER(name) from V49.
   */
  @Query(
    value = """
        SELECT * FROM location
        WHERE LOWER(name) LIKE '%' || LOWER(:query) || '%'
        ORDER BY LOWER(name) ASC
        LIMIT :limit
    """,
    nativeQuery = true
  )
  List<Location> searchByName(
    @Param("query") String query,
    @Param("limit") int limit
  );

  /**
   * Nearest stored gyms for the no-query fallback. Squared-degree distance,
   * not great-circle: longitude degrees shrink with latitude, but inside the
   * ±0.5° box (~50 km) the resulting mis-ordering is irrelevant for a
   * picker fallback and avoids a PostGIS dependency.
   */
  @Query(
    value = """
        SELECT * FROM location
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
          AND latitude BETWEEN :lat - 0.5 AND :lat + 0.5
          AND longitude BETWEEN :lng - 0.5 AND :lng + 0.5
        ORDER BY (latitude - :lat) * (latitude - :lat)
               + (longitude - :lng) * (longitude - :lng) ASC
        LIMIT :limit
    """,
    nativeQuery = true
  )
  List<Location> findNearest(
    @Param("lat") double lat,
    @Param("lng") double lng,
    @Param("limit") int limit
  );
}
