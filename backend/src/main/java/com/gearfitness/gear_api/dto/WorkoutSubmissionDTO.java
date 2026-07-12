// src/main/java/com/gearfitness/gear_api/dto/WorkoutSubmissionDTO.java
package com.gearfitness.gear_api.dto;

import com.gearfitness.gear_api.entity.MuscleGroup;
import com.gearfitness.gear_api.entity.Workout;
import java.math.BigDecimal;
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
  private String visibility; // "PUBLIC" | "FRIENDS" | "PRIVATE"
  private String caption;
  private String imageUrl;

  // Optional - S3 URLs of photos attached to the workout
  private List<String> photoUrls;

  // Optional - gym tag chosen in the picker. The backend find-or-creates the
  // location row at submit time, so nothing is persisted for search results
  // the user merely scrolled past.
  private LocationSubmissionDTO location;

  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  public static class LocationSubmissionDTO {

    private String googlePlaceId; // null for manual "add your gym" entries
    private String name;
    private String address;
    private BigDecimal latitude;
    private BigDecimal longitude;
  }

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
