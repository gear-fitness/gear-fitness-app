package com.gearfitness.gear_api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserProfileRequest {
    private String username;      // Optional - only if user wants to change it
    private Integer weightLbs;      // Optional
    private Integer heightInches;     // Optional
    private Integer age;          // Optional
    private Boolean isPrivate;    // Optional
}