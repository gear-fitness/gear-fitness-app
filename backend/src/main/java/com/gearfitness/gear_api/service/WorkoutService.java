package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.DailyVolumeDTO;
import com.gearfitness.gear_api.dto.WeeklyVolumeDTO;
import com.gearfitness.gear_api.dto.WorkoutDetailDTO;
import com.gearfitness.gear_api.dto.WorkoutExerciseDTO;
import com.gearfitness.gear_api.dto.WorkoutSetDTO;
import com.gearfitness.gear_api.dto.WorkoutSubmissionDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Exercise;
import com.gearfitness.gear_api.entity.Post;
import com.gearfitness.gear_api.entity.Workout;
import com.gearfitness.gear_api.entity.WorkoutExercise;
import com.gearfitness.gear_api.entity.WorkoutSet;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.ExerciseRepository;
import com.gearfitness.gear_api.repository.PostRepository;
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
    private final ExerciseRepository exerciseRepository;
    private final PostRepository postRepository;
    private final AppUserRepository appUserRepository;

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
                                    ws.getIsPr()))
                            .collect(Collectors.toList());

                    return new WorkoutExerciseDTO(
                            we.getWorkoutExerciseId(),
                            we.getExercise().getName(),
                            we.getExercise().getBodyPart().toString(),
                            we.getPosition(),
                            we.getNote(),
                            sets);
                })
                .collect(Collectors.toList());

        return WorkoutDetailDTO.builder()
                .workoutId(workout.getWorkoutId())
                .name(workout.getName())
                .datePerformed(workout.getDatePerformed())
                .durationMin(workout.getDurationMin())
                .bodyTag(workout.getBodyTags() != null && !workout.getBodyTags().isEmpty()
                        ? workout.getBodyTags().get(0).toString()
                        : null)
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

    // Daily volume statistics
    @Transactional(readOnly = true)
    public List<DailyVolumeDTO> getDailyVolume(UUID userId, int numberOfWeeks, DayOfWeek weekStartDay) {
        List<Workout> workouts = workoutRepository.findByUser_UserId(userId);

        if (workouts.isEmpty()) {
            return Collections.emptyList();
        }

        // Calculate date range
        // Extend endDate to the end of the current week (Saturday) to ensure full week is displayed
        LocalDate endDate = LocalDate.now()
                .with(TemporalAdjusters.nextOrSame(DayOfWeek.SATURDAY));

        // If numberOfWeeks is 0 or negative, fetch all data from the earliest workout
        LocalDate startDate;
        if (numberOfWeeks <= 0) {
            // Find the earliest workout date
            LocalDate earliestDate = workouts.stream()
                    .map(Workout::getDatePerformed)
                    .min(LocalDate::compareTo)
                    .orElse(endDate);
            // Align to the week start day
            startDate = earliestDate.with(TemporalAdjusters.previousOrSame(weekStartDay));
        } else {
            startDate = endDate
                    .minusWeeks(numberOfWeeks)
                    .with(TemporalAdjusters.previousOrSame(weekStartDay));
        }

        // Group workouts by date
        Map<LocalDate, List<Workout>> workoutsByDate = new TreeMap<>();

        for (Workout workout : workouts) {
            LocalDate workoutDate = workout.getDatePerformed();
            // Only include workouts within the date range
            if (!workoutDate.isBefore(startDate) && !workoutDate.isAfter(endDate)) {
                workoutsByDate.computeIfAbsent(workoutDate, k -> new ArrayList<>()).add(workout);
            }
        }

        // Calculate volume for each date
        Map<LocalDate, BigDecimal> volumeByDate = new HashMap<>();
        Map<LocalDate, Integer> workoutCountByDate = new HashMap<>();

        for (Map.Entry<LocalDate, List<Workout>> entry : workoutsByDate.entrySet()) {
            LocalDate date = entry.getKey();
            List<Workout> dateWorkouts = entry.getValue();

            BigDecimal totalVolume = BigDecimal.ZERO;

            for (Workout workout : dateWorkouts) {
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

            volumeByDate.put(date, totalVolume);
            workoutCountByDate.put(date, dateWorkouts.size());
        }

        // Fill gaps with zero-volume days and create DTOs
        List<DailyVolumeDTO> dailyVolumes = new ArrayList<>();
        LocalDate currentDate = startDate;

        while (!currentDate.isAfter(endDate)) {
            dailyVolumes.add(DailyVolumeDTO.builder()
                    .date(currentDate)
                    .totalVolumeLbs(volumeByDate.getOrDefault(currentDate, BigDecimal.ZERO))
                    .workoutCount(workoutCountByDate.getOrDefault(currentDate, 0))
                    .build());
            currentDate = currentDate.plusDays(1);
        }

        return dailyVolumes;
    }

    @Transactional
    public WorkoutDetailDTO submitWorkout(
            WorkoutSubmissionDTO submission,
            UUID userId) {

        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Create workout entity
        Workout workout = Workout.builder()
                .user(user)
                .name(submission.getName())
                .datePerformed(LocalDate.now())
                .durationMin(submission.getDurationMin())
                .bodyTags(submission.getBodyTags() != null ? submission.getBodyTags() : new ArrayList<>())
                .workoutExercises(new ArrayList<>())
                .build();

        // Save workout first to get ID
        workout = workoutRepository.save(workout);

        // Create workout exercises
        int position = 1;
        for (WorkoutSubmissionDTO.ExerciseSubmissionDTO exerciseDto : submission.getExercises()) {
            Exercise exercise = exerciseRepository.findById(exerciseDto.getExerciseId())
                    .orElseThrow(() -> new IllegalArgumentException("Exercise not found"));

            WorkoutExercise workoutExercise = WorkoutExercise.builder()
                    .workout(workout)
                    .exercise(exercise)
                    .position(position++)
                    .note(exerciseDto.getNote())
                    .workoutSets(new ArrayList<>())
                    .build();

            // Create sets
            int setNumber = 1;
            for (WorkoutSubmissionDTO.SetSubmissionDTO setDto : exerciseDto.getSets()) {
                // Skip empty sets
                if (setDto.getReps() == null || setDto.getWeight() == null ||
                        setDto.getWeight().trim().isEmpty()) {
                    continue;
                }

                WorkoutSet workoutSet = WorkoutSet.builder()
                        .workoutExercise(workoutExercise)
                        .setNumber(setNumber++)
                        .reps(setDto.getReps())
                        .weightLbs(new BigDecimal(setDto.getWeight()))
                        .isPr(false) // TODO: Implement PR detection
                        .build();

                workoutExercise.getWorkoutSets().add(workoutSet);
            }

            workout.getWorkoutExercises().add(workoutExercise);
        }

        // Save complete workout with exercises and sets
        workout = workoutRepository.save(workout);

        // Create post if requested
        if (Boolean.TRUE.equals(submission.getCreatePost())) {
            Post post = Post.builder()
                    .user(user)
                    .workout(workout)
                    .caption(submission.getCaption())
                    .imageUrl(submission.getImageUrl())
                    .build();

            postRepository.save(post);
        }

        // Return workout details
        return getWorkoutDetails(workout.getWorkoutId());
    }
}
