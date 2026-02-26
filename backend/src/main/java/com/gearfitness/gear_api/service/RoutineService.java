package com.gearfitness.gear_api.service;

import java.util.UUID;
import com.gearfitness.gear_api.dto.CreateRoutineFromWorkoutDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Workout;
import com.gearfitness.gear_api.repository.RoutineRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import com.gearfitness.gear_api.dto.RoutineDTO;
import com.gearfitness.gear_api.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import com.gearfitness.gear_api.repository.WorkoutRepository;

@Service
@RequiredArgsConstructor
public class RoutineService {
    private final RoutineRepository routineRepository;
    private final AppUserRepository appUserRepository;
    private final WorkoutRepository workoutRepository;

    @Transactional
    public RoutineDTO createFromWorkout(CreateRoutineFromWorkoutDTO dto, UUID userId) {
        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Workout workout = workoutRepository.findByIdWithDetails(dto.getWorkoutId())
                .orElseThrow(() -> new RuntimeException("Workout not found"));

        if (!workout.getUser().getUserId().equals(user.getUserId())) {
            throw new RuntimeException("Workout does not belong to user");
        }
    }
}
