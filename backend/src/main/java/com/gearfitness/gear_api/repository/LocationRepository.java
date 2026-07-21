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

  /** One gym page's search-result row: identity plus its visible-post count. */
  interface TaggedLocationSummary {
    UUID getLocationId();
    String getName();
    String getAddress();
    Long getPostCount();
  }

  /** Aggregate counts for a gym page header. */
  interface LocationStats {
    Long getPostCount();
    Long getAthleteCount();
  }

  /**
   * Social search: gyms that have at least one publicly visible post, ranked
   * by post count. Backs the gym results in the Social tab search — gyms
   * nobody has posted at are findable in the picker but not here.
   *
   * <p>Native (not JPQL) so it can aggregate the count in one pass; that
   * bypasses the Post entity's {@code @SQLRestriction}, so the moderation
   * filter — and app_user's soft-delete — are replicated explicitly, same as
   * AppUserRepository.rankedSearch. Only discover-grade posts are counted
   * (PUBLIC, non-private author): the count must not leak how often private
   * accounts train somewhere.
   */
  @Query(
    value = """
        SELECT l.location_id AS locationId, l.name AS name,
               l.address AS address, COUNT(p.post_id) AS postCount
        FROM location l
        JOIN workout w ON w.location_id = l.location_id
        JOIN post p ON p.workout_id = w.workout_id
        JOIN app_user u ON u.user_id = p.user_id
        WHERE p.visibility = 'PUBLIC'
          AND p.moderation_status = 'VISIBLE' AND p.hidden_at IS NULL
          AND u.is_private = false AND u.deleted_at IS NULL
          AND LOWER(l.name) LIKE '%' || LOWER(:query) || '%'
        GROUP BY l.location_id, l.name, l.address
        ORDER BY COUNT(p.post_id) DESC, LOWER(l.name) ASC
        LIMIT :limit
    """,
    nativeQuery = true
  )
  List<TaggedLocationSummary> searchTagged(
    @Param("query") String query,
    @Param("limit") int limit
  );

  /**
   * Post + distinct-athlete counts for a gym page header. Same visibility
   * filters as {@link #searchTagged} so the header numbers match the grid.
   */
  @Query(
    value = """
        SELECT COUNT(p.post_id) AS postCount,
               COUNT(DISTINCT p.user_id) AS athleteCount
        FROM workout w
        JOIN post p ON p.workout_id = w.workout_id
        JOIN app_user u ON u.user_id = p.user_id
        WHERE w.location_id = :locationId
          AND p.visibility = 'PUBLIC'
          AND p.moderation_status = 'VISIBLE' AND p.hidden_at IS NULL
          AND u.is_private = false AND u.deleted_at IS NULL
    """,
    nativeQuery = true
  )
  LocationStats getStats(@Param("locationId") UUID locationId);

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
