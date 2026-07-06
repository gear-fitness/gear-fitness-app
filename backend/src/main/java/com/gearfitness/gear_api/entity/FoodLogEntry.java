package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "food_log_entry")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoodLogEntry {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "entry_id")
  private UUID entryId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private AppUser user;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "food_id")
  private FoodItem food;

  // Free-text label for the client-side visual card this entry belongs to
  // (e.g. "Breakfast", "Meal Prep"). Categories have no backing table; this is
  // just metadata so the entry reappears under the right card on reload.
  @Column(name = "category", length = 100)
  private String category;

  @Column(name = "log_date", nullable = false)
  private LocalDate logDate;

  @Column(nullable = false)
  @Enumerated(EnumType.STRING)
  private ServingUnit unit;

  @Column(nullable = false)
  private BigDecimal quantity;

  // Snapshot of the consumed food (already scaled by quantity).
  @Column
  private String description;

  @Column
  private BigDecimal calories;

  @Column(name = "protein_g")
  private BigDecimal proteinG;

  @Column(name = "carbs_g")
  private BigDecimal carbsG;

  @Column(name = "fat_g")
  private BigDecimal fatG;

  // Where this entry's macros came from. Null for manual/quick-add entries;
  // "AI_SONAR" (freshly parsed) or "AI_CACHE" (replayed) for AI-logged food.
  @Column(name = "source_type", length = 32)
  private String sourceType;

  // Primary citation URL from Sonar for AI-logged entries.
  @Column(name = "source_url")
  private String sourceUrl;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  public enum ServingUnit {
    SERVING,
    GRAM,
  }
}
