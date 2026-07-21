package com.gearfitness.gear_api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.gearfitness.gear_api.dto.WorkoutDetailDTO;
import com.gearfitness.gear_api.dto.WorkoutSubmissionDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Workout;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.ExerciseRepository;
import com.gearfitness.gear_api.repository.ImageModerationRepository;
import com.gearfitness.gear_api.repository.NotificationRepository;
import com.gearfitness.gear_api.repository.PostRepository;
import com.gearfitness.gear_api.repository.ReportRepository;
import com.gearfitness.gear_api.repository.WorkoutRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WorkoutServiceIdempotencyTest {

  @Mock
  private WorkoutRepository workoutRepository;

  @Mock
  private ExerciseRepository exerciseRepository;

  @Mock
  private PostRepository postRepository;

  @Mock
  private AppUserRepository appUserRepository;

  @Mock
  private NotificationRepository notificationRepository;

  @Mock
  private ReportRepository reportRepository;

  @Mock
  private ImageModerationRepository imageModerationRepository;

  @Mock
  private StreakService streakService;

  @Mock
  private S3StorageService s3StorageService;

  @Mock
  private PrService prService;

  @Mock
  private ModerationService moderationService;

  @Mock
  private MentionService mentionService;

  @InjectMocks
  private WorkoutService workoutService;

  private final UUID userId = UUID.randomUUID();

  private AppUser user() {
    return AppUser.builder().userId(userId).build();
  }

  private Workout existingWorkout(UUID workoutId, String key) {
    return Workout.builder()
      .workoutId(workoutId)
      .user(user())
      .name("Push day")
      .datePerformed(LocalDate.of(2026, 7, 12))
      .idempotencyKey(key)
      .workoutExercises(new ArrayList<>())
      .bodyTags(new ArrayList<>())
      .photoUrls(new ArrayList<>())
      .build();
  }

  private WorkoutSubmissionDTO submission(String key) {
    return WorkoutSubmissionDTO.builder()
      .name("Push day")
      .durationMin(45)
      .exercises(List.of())
      .idempotencyKey(key)
      .build();
  }

  @Test
  void duplicateKeyReturnsExistingWorkoutWithoutInserting() {
    UUID existingId = UUID.randomUUID();
    String key = "session-key-1";
    Workout existing = existingWorkout(existingId, key);

    when(
      workoutRepository.findFirstByUser_UserIdAndIdempotencyKey(userId, key)
    ).thenReturn(Optional.of(existing));
    when(workoutRepository.findById(existingId)).thenReturn(
      Optional.of(existing)
    );

    WorkoutDetailDTO result = workoutService.submitWorkout(
      submission(key),
      userId
    );

    assertThat(result.getWorkoutId()).isEqualTo(existingId);
    verify(workoutRepository, never()).save(any());
    verify(workoutRepository, never()).saveAndFlush(any());
  }

  @Test
  void firstSubmissionPersistsIdempotencyKey() {
    String key = "session-key-2";

    when(
      workoutRepository.findFirstByUser_UserIdAndIdempotencyKey(userId, key)
    ).thenReturn(Optional.empty());
    when(appUserRepository.findById(userId)).thenReturn(Optional.of(user()));
    when(workoutRepository.saveAndFlush(any(Workout.class))).thenAnswer(inv -> {
      Workout w = inv.getArgument(0);
      w.setWorkoutId(UUID.randomUUID());
      return w;
    });
    when(workoutRepository.save(any(Workout.class))).thenAnswer(inv ->
      inv.getArgument(0)
    );
    when(workoutRepository.findById(any(UUID.class))).thenAnswer(inv ->
      Optional.of(existingWorkout(inv.getArgument(0), key))
    );

    workoutService.submitWorkout(submission(key), userId);

    ArgumentCaptor<Workout> captor = ArgumentCaptor.forClass(Workout.class);
    verify(workoutRepository).saveAndFlush(captor.capture());
    assertThat(captor.getValue().getIdempotencyKey()).isEqualTo(key);
  }

  @Test
  void blankKeyIsTreatedAsAbsent() {
    when(appUserRepository.findById(userId)).thenReturn(Optional.of(user()));
    when(workoutRepository.saveAndFlush(any(Workout.class))).thenAnswer(inv -> {
      Workout w = inv.getArgument(0);
      w.setWorkoutId(UUID.randomUUID());
      return w;
    });
    when(workoutRepository.save(any(Workout.class))).thenAnswer(inv ->
      inv.getArgument(0)
    );
    when(workoutRepository.findById(any(UUID.class))).thenAnswer(inv ->
      Optional.of(existingWorkout(inv.getArgument(0), null))
    );

    workoutService.submitWorkout(submission("   "), userId);

    verify(workoutRepository, never()).findFirstByUser_UserIdAndIdempotencyKey(
      any(),
      any()
    );
    ArgumentCaptor<Workout> captor = ArgumentCaptor.forClass(Workout.class);
    verify(workoutRepository).saveAndFlush(captor.capture());
    assertThat(captor.getValue().getIdempotencyKey()).isNull();
  }

  @Test
  void oversizedKeyRejected() {
    String oversized = "x".repeat(65);

    assertThatThrownBy(() ->
      workoutService.submitWorkout(submission(oversized), userId)
    ).isInstanceOf(IllegalArgumentException.class);
  }
}
