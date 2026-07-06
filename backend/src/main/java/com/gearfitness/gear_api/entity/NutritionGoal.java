package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A user's daily calorie & macro targets. Defaults are auto-calculated from the
 * user's profile (Mifflin-St Jeor); {@link #isCustom} marks a goal the user has
 * manually overridden, which is never silently recalculated.
 */
@Entity
@Table(name = "nutrition_goal")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionGoal {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "goal_id")
  private UUID goalId;

  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false, unique = true)
  private AppUser user;

  @Column(name = "calorie_goal", nullable = false)
  private Integer calorieGoal;

  @Column(name = "protein_g", nullable = false)
  private Integer proteinG;

  @Column(name = "carbs_g", nullable = false)
  private Integer carbsG;

  @Column(name = "fat_g", nullable = false)
  private Integer fatG;

  @Column(name = "is_custom", nullable = false)
  @Builder.Default
  private Boolean isCustom = false;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;
}
