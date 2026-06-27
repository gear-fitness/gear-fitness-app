package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "workout_cardio")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutCardio {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "workout_cardio_id")
  private UUID workoutCardioId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "workout_id", nullable = false)
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Workout workout;

  @Column(name = "activity_type", nullable = false)
  private String activityType;

  @Column(name = "duration_seconds", nullable = false)
  private Integer durationSeconds;

  @Column(name = "distance_meters")
  private BigDecimal distanceMeters;

  @Column(name = "calories_burned")
  private Integer caloriesBurned;

  @Column(name = "intensity_level")
  private BigDecimal intensityLevel;

  @Column(name = "notes", columnDefinition = "TEXT")
  private String notes;

  @Column(nullable = false)
  private Integer position;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
}
