package com.gearfitness.gear_api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseBodyPart {

  public enum TargetType {
    PRIMARY,
    SECONDARY,
  }

  @Enumerated(EnumType.STRING)
  @Column(name = "body_part", nullable = false)
  private MuscleGroup bodyPart;

  @Enumerated(EnumType.STRING)
  @Column(name = "target_type", nullable = false)
  private TargetType targetType;

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof ExerciseBodyPart that)) return false;
    return bodyPart == that.bodyPart && targetType == that.targetType;
  }

  @Override
  public int hashCode() {
    return Objects.hash(bodyPart, targetType);
  }
}
