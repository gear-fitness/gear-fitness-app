package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "meal_category")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealCategory {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "category_id")
  private UUID categoryId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private AppUser user;

  @Column(name = "name", nullable = false, length = 100)
  private String name;

  @Column(name = "display_order", nullable = false)
  private int displayOrder;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
}
