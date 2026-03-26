package com.gearfitness.gear_api.dto;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for workout statistics to be included in user profiles
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkoutStatsDTO {

  /**
   * Total number of completed workouts by the user
   */
  private Long totalWorkouts;

  /**
   * Number of workouts completed this week
   */
  private Long workoutsThisWeek;

  /**
   * Map of day names to workout counts for the current week
   * Keys: "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
   * Values: Number of workouts on that day (0 if none)
   */
  private Map<String, Integer> weeklySplit;

  /**
   * Number of consecutive completed weeks (Mon-Sun) where the user
   * worked out on at least 5 distinct days.
   */
  private Integer workoutStreak;

  /**
   * Number of distinct days the user has worked out in the current
   * (incomplete) week. Helps show progress toward maintaining the streak.
   */
  private Integer workoutDaysCurrentWeek;
}
