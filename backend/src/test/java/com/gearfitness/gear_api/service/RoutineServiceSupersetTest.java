package com.gearfitness.gear_api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.gearfitness.gear_api.dto.RoutineExerciseEntryDTO;
import com.gearfitness.gear_api.dto.UpdateRoutineDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Exercise;
import com.gearfitness.gear_api.entity.Routine;
import com.gearfitness.gear_api.entity.RoutineExercise;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.ExerciseRepository;
import com.gearfitness.gear_api.repository.RoutineRepository;
import com.gearfitness.gear_api.repository.WorkoutRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RoutineServiceSupersetTest {

  @Mock
  private RoutineRepository routineRepository;

  @Mock
  private AppUserRepository appUserRepository;

  @Mock
  private WorkoutRepository workoutRepository;

  @Mock
  private ExerciseRepository exerciseRepository;

  @InjectMocks
  private RoutineService routineService;

  private final UUID userId = UUID.randomUUID();
  private final UUID routineId = UUID.randomUUID();

  private final Exercise benchPress = exercise("Bench Press");
  private final Exercise row = exercise("Row");
  private final Exercise squat = exercise("Squat");

  private Routine routine;

  private static Exercise exercise(String name) {
    return Exercise.builder().exerciseId(UUID.randomUUID()).name(name).build();
  }

  private RoutineExercise member(
    Exercise exercise,
    int position,
    Integer supersetGroup
  ) {
    return RoutineExercise.builder()
      .routineExerciseId(UUID.randomUUID())
      .routine(routine)
      .exercise(exercise)
      .position(position)
      .supersetGroup(supersetGroup)
      .build();
  }

  private UpdateRoutineDTO legacyUpdate(List<UUID> exerciseIds) {
    UpdateRoutineDTO dto = new UpdateRoutineDTO();
    dto.setExerciseIds(exerciseIds);
    return dto;
  }

  private List<Integer> savedGroups() {
    ArgumentCaptor<Routine> captor = ArgumentCaptor.forClass(Routine.class);
    verify(routineRepository).save(captor.capture());
    return captor
      .getValue()
      .getRoutineExercises()
      .stream()
      .map(RoutineExercise::getSupersetGroup)
      .toList();
  }

  @BeforeEach
  void setUp() {
    routine = Routine.builder()
      .routineId(routineId)
      .user(AppUser.builder().userId(userId).build())
      .name("Push day")
      .build();

    when(routineRepository.findByRoutineId(routineId)).thenReturn(
      Optional.of(routine)
    );
    when(routineRepository.save(any(Routine.class))).thenAnswer(inv ->
      inv.getArgument(0)
    );
    for (Exercise e : List.of(benchPress, row, squat)) {
      lenient()
        .when(exerciseRepository.findById(e.getExerciseId()))
        .thenReturn(Optional.of(e));
    }
  }

  @Test
  void legacyUpdatePreservesGroupsViaCarryOver() {
    routine.getRoutineExercises().add(member(benchPress, 1, 1));
    routine.getRoutineExercises().add(member(row, 2, 1));
    routine.getRoutineExercises().add(member(squat, 3, null));

    routineService.updateRoutine(
      routineId,
      legacyUpdate(
        List.of(
          benchPress.getExerciseId(),
          row.getExerciseId(),
          squat.getExerciseId()
        )
      ),
      userId
    );

    assertThat(savedGroups()).containsExactly(1, 1, null);
  }

  @Test
  void legacyReorderBreakingAdjacencyDegradesToUngrouped() {
    routine.getRoutineExercises().add(member(benchPress, 1, 1));
    routine.getRoutineExercises().add(member(row, 2, 1));
    routine.getRoutineExercises().add(member(squat, 3, null));

    routineService.updateRoutine(
      routineId,
      legacyUpdate(
        List.of(
          benchPress.getExerciseId(),
          squat.getExerciseId(),
          row.getExerciseId()
        )
      ),
      userId
    );

    assertThat(savedGroups()).containsExactly(null, null, null);
  }

  @Test
  void legacyUpdateConsumesDuplicateExerciseIdMatchesInOrder() {
    routine.getRoutineExercises().add(member(benchPress, 1, 1));
    routine.getRoutineExercises().add(member(row, 2, 1));
    routine.getRoutineExercises().add(member(benchPress, 3, null));

    routineService.updateRoutine(
      routineId,
      legacyUpdate(
        List.of(
          benchPress.getExerciseId(),
          row.getExerciseId(),
          benchPress.getExerciseId()
        )
      ),
      userId
    );

    assertThat(savedGroups()).containsExactly(1, 1, null);
  }

  @Test
  void newShapeExercisesWinsOverExerciseIds() {
    routine.getRoutineExercises().add(member(benchPress, 1, null));

    UpdateRoutineDTO dto = new UpdateRoutineDTO();
    dto.setExerciseIds(List.of(benchPress.getExerciseId()));
    dto.setExercises(
      List.of(
        new RoutineExerciseEntryDTO(benchPress.getExerciseId(), 5),
        new RoutineExerciseEntryDTO(row.getExerciseId(), 5),
        new RoutineExerciseEntryDTO(squat.getExerciseId(), null)
      )
    );

    routineService.updateRoutine(routineId, dto, userId);

    assertThat(savedGroups()).containsExactly(1, 1, null);
  }
}
