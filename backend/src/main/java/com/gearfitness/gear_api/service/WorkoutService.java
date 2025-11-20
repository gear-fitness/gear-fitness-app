package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.WeeklyVolumeDTO;
import com.gearfitness.gear_api.dto.WorkoutDetailDTO;
import com.gearfitness.gear_api.dto.WorkoutExerciseDTO;
import com.gearfitness.gear_api.dto.WorkoutSetDTO;
import com.gearfitness.gear_api.entity.Workout;
import com.gearfitness.gear_api.entity.WorkoutExercise;
import com.gearfitness.gear_api.entity.WorkoutSet;
import com.gearfitness.gear_api.repository.WorkoutRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkoutService {

    private final WorkoutRepository workoutRepository;

    @Transactional(readOnly = true)
    public List<Workout> getWorkoutsByUser(UUID userId) {
        return workoutRepository.findByUser_UserId(userId);
    }

    @Transactional(readOnly = true)
    public WorkoutDetailDTO getWorkoutDetails(UUID workoutId) {
        Workout workout = workoutRepository.findById(workoutId)
                .orElseThrow(() -> new RuntimeException("Workout not found with id: " + workoutId));

        List<WorkoutExerciseDTO> exercises = workout.getWorkoutExercises()
                .stream()
                .sorted(Comparator.comparing(WorkoutExercise::getPosition))
                .map(we -> {
                    List<WorkoutSetDTO> sets = we.getWorkoutSets()
                            .stream()
                            .sorted(Comparator.comparing(ws -> ws.getSetNumber()))
                            .map(ws -> new WorkoutSetDTO(
                                    ws.getWorkoutSetId(),
                                    ws.getSetNumber(),
                                    ws.getReps(),
                                    ws.getWeightLbs(),
                                    ws.getIsPr()
                            ))
                            .collect(Collectors.toList());

                    return new WorkoutExerciseDTO(
                            we.getWorkoutExerciseId(),
                            we.getExercise().getName(),
                            we.getExercise().getBodyPart().toString(),
                            we.getPosition(),
                            we.getNote(),
                            sets
                    );
                })
                .collect(Collectors.toList());

        return WorkoutDetailDTO.builder()
                .workoutId(workout.getWorkoutId())
                .name(workout.getName())
                .datePerformed(workout.getDatePerformed())
                .durationMin(workout.getDurationMin())
                .bodyTag(workout.getBodyTag() != null ? workout.getBodyTag().toString() : null)
                .exercises(exercises)
                .build();
    }

    public Workout addWorkout(Workout workout) {
        return workoutRepository.save(workout);
    }

    // Weekly volume statistics
    @Transactional(readOnly = true)
    public List<WeeklyVolumeDTO> getWeeklyVolume(UUID userId, int numberOfWeeks) {
        List<Workout> workouts = workoutRepository.findByUser_UserId(userId);
        
        if (workouts.isEmpty()) {
            return Collections.emptyList();
        }

        // Group workouts by week
        Map<LocalDate, List<Workout>> workoutsByWeek = new TreeMap<>();
        
        for (Workout workout : workouts) {
            LocalDate workoutDate = workout.getDatePerformed();
            LocalDate weekStart = workoutDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            
            workoutsByWeek.computeIfAbsent(weekStart, k -> new ArrayList<>()).add(workout);
        }

        // Calculate volume for each week
        List<WeeklyVolumeDTO> weeklyVolumes = new ArrayList<>();
        
        for (Map.Entry<LocalDate, List<Workout>> entry : workoutsByWeek.entrySet()) {
            LocalDate weekStart = entry.getKey();
            LocalDate weekEnd = weekStart.plusDays(6);
            List<Workout> weekWorkouts = entry.getValue();
            
            BigDecimal totalVolume = BigDecimal.ZERO;
            
            for (Workout workout : weekWorkouts) {
                for (WorkoutExercise exercise : workout.getWorkoutExercises()) {
                    for (WorkoutSet set : exercise.getWorkoutSets()) {
                        if (set.getWeightLbs() != null && set.getReps() != null) {
                            BigDecimal setVolume = set.getWeightLbs()
                                    .multiply(new BigDecimal(set.getReps()));
                            totalVolume = totalVolume.add(setVolume);
                        }
                    }
                }
            }
            
            weeklyVolumes.add(WeeklyVolumeDTO.builder()
                    .weekStartDate(weekStart)
                    .weekEndDate(weekEnd)
                    .totalVolumeLbs(totalVolume)
                    .workoutCount(weekWorkouts.size())
                    .build());
        }
        
        // Sort by date
        weeklyVolumes.sort(Comparator.comparing(WeeklyVolumeDTO::getWeekStartDate));
        
        // Return only the requested number of weeks (most recent)
        if (numberOfWeeks > 0 && weeklyVolumes.size() > numberOfWeeks) {
            return weeklyVolumes.subList(weeklyVolumes.size() - numberOfWeeks, weeklyVolumes.size());
        }
        
        return weeklyVolumes;
    }
}
