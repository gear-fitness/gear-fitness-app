package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Memoized Places gym-search response, keyed by normalized query text plus
 * ~1 km-rounded caller coordinates. Rows are only written on a miss (a paid
 * Places call), so their per-month count backs the spend guard — the same
 * design as {@link NutritionCache} for Sonar. Rows older than 30 days are
 * expired and rewritten on next lookup (Google's cache-duration ceiling).
 */
@Entity
@Table(name = "location_search_cache")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationSearchCache {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "cache_id")
  private UUID cacheId;

  @Column(name = "cache_key", nullable = false, unique = true, length = 600)
  private String cacheKey;

  // JSON array of LocationSearchResultDTO (serialized by LocationSearchService).
  @Column(name = "results", nullable = false, columnDefinition = "text")
  private String results;

  @Column(name = "hit_count", nullable = false)
  @Builder.Default
  private Integer hitCount = 0;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "last_hit_at")
  private LocalDateTime lastHitAt;
}
