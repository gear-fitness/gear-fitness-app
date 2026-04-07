package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.CreateRoutineDTO;
import com.gearfitness.gear_api.dto.CreateRoutineFromWorkoutDTO;
import com.gearfitness.gear_api.dto.RoutineDTO;
import com.gearfitness.gear_api.dto.RoutineExerciseDTO;
import com.gearfitness.gear_api.dto.UpdateRoutineDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Exercise;
import com.gearfitness.gear_api.entity.Routine;
import com.gearfitness.gear_api.entity.RoutineExercise;
import com.gearfitness.gear_api.entity.Workout;
import com.gearfitness.gear_api.entity.WorkoutExercise;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.ExerciseRepository;
import com.gearfitness.gear_api.repository.RoutineRepository;
import com.gearfitness.gear_api.repository.WorkoutRepository;
import jakarta.transaction.Transactional;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RoutineService {

  private final RoutineRepository routineRepository;
  private final AppUserRepository appUserRepository;
  private final WorkoutRepository workoutRepository;
  private final ExerciseRepository exerciseRepository;

  @Transactional
  public RoutineDTO createFromWorkout(
    CreateRoutineFromWorkoutDTO dto,
    UUID userId
  ) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new RuntimeException("User not found"));

    Workout workout = workoutRepository
      .findByIdWithDetails(dto.getWorkoutId())
      .orElseThrow(() -> new RuntimeException("Workout not found"));

    List<Routine.ScheduledDay> mappedDays =
      (dto.getScheduledDays()) == null || dto.getScheduledDays().isEmpty()
        ? new ArrayList<>()
        : dto
            .getScheduledDays()
            .stream()
            .map(s -> Routine.ScheduledDay.valueOf(s.toUpperCase()))
            .toList();

    Routine routine = Routine.builder()
      .user(user)
      .name(dto.getName())
      .sourceWorkout(workout)
      .scheduledDays(mappedDays)
      .build();

    for (WorkoutExercise workoutExercise : workout.getWorkoutExercises()) {
      RoutineExercise routineExercise = RoutineExercise.builder()
        .routine(routine)
        .exercise(workoutExercise.getExercise())
        .position(workoutExercise.getPosition())
        .build();
      routine.getRoutineExercises().add(routineExercise);
    }

    Routine saved = routineRepository.save(routine);
    return toRoutineDTO(saved);
  }

  @Transactional
  public RoutineDTO createRoutine(CreateRoutineDTO dto, UUID userId) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new RuntimeException("User not found"));

    List<Routine.ScheduledDay> mappedDays = (dto.getScheduledDays() == null ||
      dto.getScheduledDays().isEmpty())
      ? new ArrayList<>()
      : dto
          .getScheduledDays()
          .stream()
          .map(s -> Routine.ScheduledDay.valueOf(s.toUpperCase()))
          .toList();

    Routine routine = Routine.builder()
      .user(user)
      .name(dto.getName())
      .scheduledDays(mappedDays)
      .build();

    if (dto.getExerciseIds() != null) {
      for (int i = 0; i < dto.getExerciseIds().size(); i++) {
        UUID exerciseId = dto.getExerciseIds().get(i);
        Exercise exercise = exerciseRepository
          .findById(exerciseId)
          .orElseThrow(() ->
            new RuntimeException("Exercise not found: " + exerciseId)
          );
        RoutineExercise routineExercise = RoutineExercise.builder()
          .routine(routine)
          .exercise(exercise)
          .position(i + 1)
          .build();
        routine.getRoutineExercises().add(routineExercise);
      }
    }

    Routine saved = routineRepository.save(routine);
    return toRoutineDTO(saved);
  }

  public List<RoutineDTO> getUserRoutines(UUID userId) {
    return routineRepository
      .findByUser_UserIdOrderByCreatedAtDesc(userId)
      .stream()
      .map(this::toRoutineDTO)
      .collect(Collectors.toList());
  }

  @Transactional
  public RoutineDTO getRoutineDetail(UUID routineId, UUID userId) {
    Routine routine = routineRepository
      .findByRoutineId(routineId)
      .orElseThrow(() -> new IllegalArgumentException("Routine not found"));

    if (!routine.getUser().getUserId().equals(userId)) {
      throw new IllegalArgumentException("Unauthorized access");
    }

    return toRoutineDTO(routine);
  }

  public List<RoutineDTO> getTodaysRoutines(UUID userId, String localDate) {
    LocalDate date = (localDate != null && !localDate.isBlank())
      ? LocalDate.parse(localDate)
      : LocalDate.now();
    DayOfWeek today = date.getDayOfWeek();

    return routineRepository
      .findByUser_UserIdOrderByCreatedAtDesc(userId)
      .stream()
      .filter(
        r ->
          r.getScheduledDays() != null &&
          r
            .getScheduledDays()
            .stream()
            .map(sd -> DayOfWeek.valueOf(sd.name()))
            .anyMatch(d -> d == today)
      )
      .map(this::toRoutineDTO)
      .collect(Collectors.toList());
  }

  @Transactional
  public RoutineDTO updateRoutine(
    UUID routineId,
    UpdateRoutineDTO dto,
    UUID userId
  ) {
    Routine routine = routineRepository
      .findByRoutineId(routineId)
      .orElseThrow(() -> new IllegalArgumentException("Routine not found"));

    if (!routine.getUser().getUserId().equals(userId)) {
      throw new IllegalArgumentException("Unauthorized access");
    }
    if (dto.getName() != null && !dto.getName().isBlank()) {
      routine.setName(dto.getName());
    }
    if (dto.getScheduledDays() != null) {
      List<Routine.ScheduledDay> mapped = dto
        .getScheduledDays()
        .stream()
        .map(d -> Routine.ScheduledDay.valueOf(d.toUpperCase()))
        .collect(Collectors.toList());
      routine.setScheduledDays(mapped);
    }
    if (dto.getExerciseIds() != null) {
      routine.getRoutineExercises().clear();
      for (int i = 0; i < dto.getExerciseIds().size(); i++) {
        UUID exerciseId = dto.getExerciseIds().get(i);
        Exercise exercise = exerciseRepository
          .findById(exerciseId)
          .orElseThrow(() ->
            new RuntimeException("Exercise not found: " + exerciseId)
          );
        RoutineExercise routineExercise = RoutineExercise.builder()
          .routine(routine)
          .exercise(exercise)
          .position(i + 1)
          .build();
        routine.getRoutineExercises().add(routineExercise);
      }
    }

    Routine saved = routineRepository.save(routine);
    return toRoutineDTO(saved);
  }

  @Transactional
  public void deleteRoutine(UUID routineId, UUID userId) {
    Routine routine = routineRepository
      .findByRoutineId(routineId)
      .orElseThrow(() -> new IllegalArgumentException("Routine not found"));

    if (!routine.getUser().getUserId().equals(userId)) {
      throw new IllegalArgumentException("Unauthorized access");
    }

    routineRepository.delete(routine);
  }

  private RoutineDTO toRoutineDTO(Routine routine) {
    RoutineDTO dto = new RoutineDTO();
    dto.setRoutineId(routine.getRoutineId());
    dto.setName(routine.getName());
    dto.setCreatedAt(routine.getCreatedAt());

    List<DayOfWeek> dtoDays =
      routine.getScheduledDays() == null
        ? List.of()
        : routine
            .getScheduledDays()
            .stream()
            .map(sd -> DayOfWeek.valueOf(sd.name()))
            .collect(Collectors.toList());
    dto.setScheduledDays(dtoDays);

    List<RoutineExerciseDTO> exerciseDTOs =
      routine.getRoutineExercises() == null
        ? List.of()
        : routine
            .getRoutineExercises()
            .stream()
            .map(re -> {
              RoutineExerciseDTO e = new RoutineExerciseDTO();
              e.setRoutineExerciseId(re.getRoutineExerciseId());
              e.setExerciseName(re.getExercise().getName());
              e.setBodyPart(re.getExercise().getBodyPart().name());
              e.setPosition(re.getPosition());
              e.setExerciseId(re.getExercise().getExerciseId());
              return e;
            })
            .collect(Collectors.toList());
    dto.setExercises(exerciseDTOs);
    return dto;
  }
}
