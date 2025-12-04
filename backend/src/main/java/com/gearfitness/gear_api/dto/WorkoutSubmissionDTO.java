// src/main/java/com/gearfitness/gear_api/dto/WorkoutSubmissionDTO.java
package com.gearfitness.gear_api.dto;

import com.gearfitness.gear_api.entity.Workout;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutSubmissionDTO {
    private String name;
    private Integer durationMin;
    private List<Workout.BodyTag> bodyTags;
    private List<ExerciseSubmissionDTO> exercises;

    // Optional - for creating a post
    private Boolean createPost;
    private String caption;
    private String imageUrl;

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