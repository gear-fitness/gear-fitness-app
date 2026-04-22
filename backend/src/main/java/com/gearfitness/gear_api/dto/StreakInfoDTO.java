package com.gearfitness.gear_api.dto;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StreakInfoDTO {

  private int currentStreak;
  private int longestStreak;
  private int restoreTokensRemaining;
  private boolean todayLogged;
  private LocalDate lastStreakDate;
}
