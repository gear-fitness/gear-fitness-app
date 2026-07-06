package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A seeded food from the USDA FoodData Central dataset. Nutrient values are
 * stored per 100 g (the USDA standard); per-serving amounts are derived at
 * read time from {@link #servingSize}.
 */
@Entity
@Table(name = "food_item")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoodItem {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "food_id")
  private UUID foodId;

  @Column(name = "fdc_id", unique = true)
  private Long fdcId;

  @Column(nullable = false)
  private String description;

  @Column(name = "brand_owner")
  private String brandOwner;

  @Column(name = "data_type")
  private String dataType;

  @Column(name = "serving_size")
  private BigDecimal servingSize;

  @Column(name = "serving_unit")
  private String servingUnit;

  @Column(name = "household_serving")
  private String householdServing;

  /** kcal per 100 g. */
  @Column
  private BigDecimal calories;

  @Column(name = "protein_g")
  private BigDecimal proteinG;

  @Column(name = "carbs_g")
  private BigDecimal carbsG;

  @Column(name = "fat_g")
  private BigDecimal fatG;
}
