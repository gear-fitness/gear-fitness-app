package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.repository.RoutineRepository;

import jakarta.transaction.Transactional;

import org.springframework.stereotype.Service;

import com.gearfitness.gear_api.dto.RoutineDTO;
import com.gearfitness.gear_api.repository.AppUserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RoutineService {
    private final RoutineRepository routineRepository;
    private final AppUserRepository appUserRepository;

    @Transactional
    public RoutineDTO createFromWorkout(CreateRoutineFromWorkoutDTO dto userId) {
        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Workout workout = workoutRepository.findById(dto.getWorkoutId())
                .orElseThrow(() -> new RuntimeException("Workout not found"));

        if (!workout.getUser())
    }
}
