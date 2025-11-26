package com.gearfitness.gear_api.dto;

import java.util.UUID;

import com.gearfitness.gear_api.entity.Exercise.BodyPart;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseDTO {
    private UUID exerciseId;
    private String name;
    private BodyPart bodyPart;
    private String description;
}

