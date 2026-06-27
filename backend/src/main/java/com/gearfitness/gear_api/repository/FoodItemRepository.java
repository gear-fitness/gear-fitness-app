package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.FoodItem;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FoodItemRepository extends JpaRepository<FoodItem, UUID> {
  Optional<FoodItem> findByFdcId(Long fdcId);

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
}
