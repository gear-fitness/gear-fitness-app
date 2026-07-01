package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A reusable meal a user saved from the Smart Journal ("Save as Meal"): a name
 * plus a JSON snapshot of its items (each with a description and macros). Stored
 * opaquely as JSON since items are only ever read/written as a whole group.
 */
@Entity
@Table(name = "saved_meal")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedMeal {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "meal_id")
  private UUID mealId;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "name", nullable = false, length = 200)
  private String name;

  // JSON array: [{name,calories,proteinG,carbsG,fatG}]
  @Column(name = "items_json", nullable = false, columnDefinition = "text")
  private String itemsJson;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;
}
