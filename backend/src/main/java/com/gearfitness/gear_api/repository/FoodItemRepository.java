package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.FoodItem;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FoodItemRepository extends JpaRepository<FoodItem, UUID> {
  /**
   * Relevance-first food search. Ranks by a text-match tier (exact 100 >
   * prefix 80 > word-start 60 > contains 40 > trigram-fuzzy 20), then trigram
   * similarity, with shorter (less specific) descriptions and whole foods
   * preferred on ties. Native query so it can use the {@code pg_trgm}
   * operators backed by the trigram GIN index from V32.
   */
  @Query(
    value = """
        SELECT * FROM food_item f
        WHERE LOWER(f.description) LIKE '%' || LOWER(:query) || '%'
           OR LOWER(f.description) % LOWER(:query)
        ORDER BY
          CASE
            WHEN LOWER(f.description) = LOWER(:query) THEN 100
            WHEN LOWER(f.description) LIKE LOWER(:query) || '%' THEN 80
            WHEN LOWER(f.description) LIKE '% ' || LOWER(:query) || '%' THEN 60
            WHEN LOWER(f.description) LIKE '%' || LOWER(:query) || '%' THEN 40
            ELSE 20
          END DESC,
          word_similarity(LOWER(:query), LOWER(f.description)) DESC,
          CASE WHEN f.brand_owner IS NULL THEN 0 ELSE 1 END ASC,
          LENGTH(f.description) ASC
        LIMIT :limit OFFSET :offset
    """,
    nativeQuery = true
  )
  List<FoodItem> search(
    @Param("query") String query,
    @Param("limit") int limit,
    @Param("offset") int offset
  );

  /**
   * Default browse list shown before the user types a query. Favors whole foods
   * (no brand) and shorter, less-specific descriptions so the list stays useful
   * even once the table is loaded with a heavy USDA extract.
   */
  @Query(
    value = """
        SELECT * FROM food_item f
        ORDER BY
          CASE WHEN f.brand_owner IS NULL THEN 0 ELSE 1 END ASC,
          LENGTH(f.description) ASC,
          f.description ASC
        LIMIT :limit OFFSET :offset
    """,
    nativeQuery = true
  )
  List<FoodItem> browse(@Param("limit") int limit, @Param("offset") int offset);

  /**
   * The user's own foods, ranked by a recency + frequency hybrid so their
   * staples and recently-eaten foods lead the Add Food screen's pre-search
   * list. Frequency (log count) is the base score; recently-logged foods get a
   * bonus so they surface first. Only entries linked to a real food are
   * considered (quick-add / AI entries have a null food_id). Native so it can
   * aggregate over food_log_entry and reuse the food_item mapping.
   */
  @Query(
    value = """
        SELECT f.* FROM food_item f
        JOIN (
          SELECT food_id, COUNT(*) AS cnt, MAX(created_at) AS last_at
          FROM food_log_entry
          WHERE user_id = :userId AND food_id IS NOT NULL
          GROUP BY food_id
        ) agg ON f.food_id = agg.food_id
        ORDER BY
          (agg.cnt + CASE
             WHEN agg.last_at > NOW() - INTERVAL '2 days'  THEN 4
             WHEN agg.last_at > NOW() - INTERVAL '7 days'  THEN 2
             WHEN agg.last_at > NOW() - INTERVAL '30 days' THEN 1
             ELSE 0 END) DESC,
          agg.last_at DESC
        LIMIT :limit
    """,
    nativeQuery = true
  )
  List<FoodItem> findUserFoods(
    @Param("userId") UUID userId,
    @Param("limit") int limit
  );
}
