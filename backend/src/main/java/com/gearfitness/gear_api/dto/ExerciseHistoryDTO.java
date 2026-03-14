package com.gearfitness.gear_api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ExerciseHistoryDTO {
    private UUID exerciseId;
    private String exerciseName;
    private String bodyPart;
    private Integer totalSessions;
    private BigDecimal personalRecordLbs;
    private List<ExerciseSessionDTO> sessions;
}
