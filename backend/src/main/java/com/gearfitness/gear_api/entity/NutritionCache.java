package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Memoized Perplexity Sonar parse result, keyed by the normalized user text.
 * Lets repeated phrases ("2 scrambled eggs") replay logging without re-hitting
 * the paid API. {@link #parsedResult} and {@link #sourceUrls} hold JSON strings
 * (serialized app-side by AiNutritionService) since the cache is opaque storage.
 */
@Entity
@Table(name = "nutrition_cache")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionCache {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "cache_id")
  private UUID cacheId;

  @Column(name = "normalized_key", nullable = false, unique = true, length = 512)
  private String normalizedKey;

  // JSON array of parsed foods: [{description,calories,proteinG,carbsG,fatG}]
  @Column(name = "parsed_result", nullable = false, columnDefinition = "text")
  private String parsedResult;

  // JSON array of Sonar citation URLs.
  @Column(name = "source_urls", nullable = false, columnDefinition = "text")
  @Builder.Default
  private String sourceUrls = "[]";

  @Column(name = "hit_count", nullable = false)
  @Builder.Default
  private Integer hitCount = 0;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "last_hit_at")
  private LocalDateTime lastHitAt;
}
