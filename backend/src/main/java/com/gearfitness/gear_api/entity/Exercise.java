package com.gearfitness.gear_api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
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

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(
    name = "exercise_body_part",
    joinColumns = @JoinColumn(name = "exercise_id")
  )
  @Builder.Default
  private Set<ExerciseBodyPart> bodyParts = new HashSet<>();

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

  /** Returns the first PRIMARY body part, or falls back to any body part. */
  public BodyPart getPrimaryBodyPart() {
    return bodyParts
      .stream()
      .filter(bp -> bp.getTargetType() == ExerciseBodyPart.TargetType.PRIMARY)
      .map(ExerciseBodyPart::getBodyPart)
      .findFirst()
      .orElse(
        bodyParts
          .stream()
          .map(ExerciseBodyPart::getBodyPart)
          .findFirst()
          .orElse(BodyPart.OTHER)
      );
  }

  /** Returns all body parts with a given target type. */
  public Set<BodyPart> getBodyPartsByType(
    ExerciseBodyPart.TargetType targetType
  ) {
    return bodyParts
      .stream()
      .filter(bp -> bp.getTargetType() == targetType)
      .map(ExerciseBodyPart::getBodyPart)
      .collect(Collectors.toSet());
  }

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
