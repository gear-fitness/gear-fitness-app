package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.entity.Workout;
import com.gearfitness.gear_api.repository.WorkoutRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkoutService {

    private final WorkoutRepository workoutRepository;

    public List<Workout> getWorkoutsByUser(UUID userId) {
        return workoutRepository.findByUser_UserId(userId);
    }

    public Workout addWorkout(Workout workout) {
        return workoutRepository.save(workout);
    }
}
