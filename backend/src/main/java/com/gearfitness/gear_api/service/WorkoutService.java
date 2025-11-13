package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.WorkoutDetailDTO;
import com.gearfitness.gear_api.dto.WorkoutExerciseDTO;
import com.gearfitness.gear_api.dto.WorkoutSetDTO;
import com.gearfitness.gear_api.entity.Workout;
import com.gearfitness.gear_api.entity.WorkoutExercise;
import com.gearfitness.gear_api.repository.WorkoutRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
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
                                    ws.getWeightLbs(),  // Changed from getWeightKg to getWeightLbs
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
}
