package com.gearfitness.gear_api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Entity
@Table(name = "exercise")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exercise {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "exercise_id")
  private UUID exerciseId;

  @Column(nullable = false)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(name = "body_part", nullable = false)
  private BodyPart bodyPart;

  @Column(columnDefinition = "TEXT")
  private String description;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id")
  private AppUser user;

  // Relationships
  @OneToMany(
    mappedBy = "exercise",
    cascade = CascadeType.ALL,
    orphanRemoval = true
  )
  @JsonIgnore
  @Builder.Default
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Set<WorkoutExercise> workoutExercises = new HashSet<>();

  public enum BodyPart {
    CHEST,
    BACK,
    SHOULDERS,
    BICEPS,
    TRICEPS,
    LEGS,
    QUADS,
    HAMSTRINGS,
    GLUTES,
    CALVES,
    CORE,
    TRAPS,
    FOREARMS,
    FULL_BODY,
    OTHER,
  }
}
