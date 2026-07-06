package com.gearfitness.gear_api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class WorkoutDTO {

  private UUID workoutId;
  private String name;
  private LocalDate datePerformed;
  private LocalDateTime createdAt;
  private Integer durationMin;
  private Integer exerciseCount;
  private List<String> bodyTags;
  // Cardio summary for the workout card. cardioCount is 0 when the workout has
  // no cardio; the activity/duration describe the first cardio entry (by
  // position) so the card can show e.g. "Run · 32:00" without a detail fetch.
  private Integer cardioCount;
  private String cardioActivityType;
  private Integer cardioDurationSeconds;
}
