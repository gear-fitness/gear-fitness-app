package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.entity.WorkoutSet;
import com.gearfitness.gear_api.repository.WorkoutSetRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PrService {

  private final WorkoutSetRepository workoutSetRepository;

  /**
   * Recompute is_pr for every set belonging to the given (user, exercise) pair.
   *
   * Rule: at most one set per workout is flagged as a PR — the heaviest set in
   * that workout, and only if its weight strictly exceeds the running max
   * across all earlier workouts. Null-weight sets are skipped. Tiebreak within
   * a workout (multiple sets at the session max): most reps wins; if reps also
   * tie, earliest by position then set_number.
   *
   * Matches the running-max semantics of the PR chart in ExerciseHistory.tsx,
   * which collapses each session to a single point.
   */
  @Transactional
  public void recomputePrsForUserExercise(UUID userId, UUID exerciseId) {
    List<WorkoutSet> sets =
      workoutSetRepository.findChronologicalForUserExercise(userId, exerciseId);

    // Group sets by workout, preserving chronological workout order.
    LinkedHashMap<UUID, List<WorkoutSet>> byWorkout = new LinkedHashMap<>();
    for (WorkoutSet s : sets) {
      UUID workoutId = s.getWorkoutExercise().getWorkout().getWorkoutId();
      byWorkout.computeIfAbsent(workoutId, k -> new ArrayList<>()).add(s);
    }

    BigDecimal runningMax = null;
    Set<UUID> prSetIds = new HashSet<>();

    for (List<WorkoutSet> workoutSets : byWorkout.values()) {
      // Best qualifying set in this workout: heaviest weight, then most reps,
      // then earliest by position/set_number (the list is already ordered that
      // way, so strict comparison on the first two keys preserves the third).
      WorkoutSet best = null;
      for (WorkoutSet s : workoutSets) {
        BigDecimal w = s.getWeightLbs();
        if (w == null) continue;
        if (best == null) {
          best = s;
          continue;
        }
        int weightCmp = w.compareTo(best.getWeightLbs());
        if (weightCmp > 0 || (weightCmp == 0 && s.getReps() > best.getReps())) {
          best = s;
        }
      }
      if (best == null) continue;

      BigDecimal sessionMax = best.getWeightLbs();
      if (runningMax == null || sessionMax.compareTo(runningMax) > 0) {
        runningMax = sessionMax;
        prSetIds.add(best.getWorkoutSetId());
      }
    }

    List<WorkoutSet> changed = new ArrayList<>();
    for (WorkoutSet s : sets) {
      boolean shouldBePr = prSetIds.contains(s.getWorkoutSetId());
      if (!Boolean.valueOf(shouldBePr).equals(s.getIsPr())) {
        s.setIsPr(shouldBePr);
        changed.add(s);
      }
    }

    if (!changed.isEmpty()) {
      workoutSetRepository.saveAll(changed);
    }
  }
}
