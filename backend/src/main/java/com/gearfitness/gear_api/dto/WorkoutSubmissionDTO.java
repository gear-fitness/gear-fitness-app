// src/main/java/com/gearfitness/gear_api/dto/WorkoutSubmissionDTO.java
package com.gearfitness.gear_api.dto;

import com.gearfitness.gear_api.entity.MuscleGroup;
import com.gearfitness.gear_api.entity.Workout;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutSubmissionDTO {

  private String name;
  private Integer durationMin;
  private String datePerformed; // Optional - date in YYYY-MM-DD format from client
  private List<MuscleGroup> bodyTags;
  private List<ExerciseSubmissionDTO> exercises;

  // Optional - for creating a post
  private Boolean createPost;
  private String caption;
  private String imageUrl;

  // Optional - S3 URLs of photos attached to the workout
  private List<String> photoUrls;

  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ExerciseSubmissionDTO {

    private UUID exerciseId;
    private String note;
    private List<SetSubmissionDTO> sets;
  }

  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  public static class SetSubmissionDTO {

    private Integer reps;
    private String weight; // String from frontend, will convert to BigDecimal
  }
}
