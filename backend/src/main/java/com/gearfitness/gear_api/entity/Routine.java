package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "routine")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Routine {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "routine_id")
  private UUID routineId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private AppUser user;

  @Column(nullable = false)
  private String name;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "source_workout_id")
  private Workout sourceWorkout;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(
    name = "routine_scheduled_days",
    joinColumns = @JoinColumn(name = "routine_id")
  )
  @Column(name = "scheduled_day")
  @Enumerated(EnumType.STRING)
  @Builder.Default
  private List<ScheduledDay> scheduledDays = new ArrayList<>();

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @OneToMany(
    mappedBy = "routine",
    cascade = CascadeType.ALL,
    orphanRemoval = true,
    fetch = FetchType.EAGER
  )
  @OrderBy("position ASC")
  @Builder.Default
  private List<RoutineExercise> routineExercises = new ArrayList<>();

  public enum ScheduledDay {
    MONDAY,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    FRIDAY,
    SATURDAY,
    SUNDAY,
  }
}
