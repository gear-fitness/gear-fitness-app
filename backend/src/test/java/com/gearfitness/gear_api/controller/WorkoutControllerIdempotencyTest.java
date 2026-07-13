package com.gearfitness.gear_api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.gearfitness.gear_api.dto.WorkoutDetailDTO;
import com.gearfitness.gear_api.dto.WorkoutSubmissionDTO;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.S3StorageService;
import com.gearfitness.gear_api.service.WorkoutService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class WorkoutControllerIdempotencyTest {

  @Mock
  private WorkoutService workoutService;

  @Mock
  private JwtService jwtService;

  @Mock
  private S3StorageService s3StorageService;

  @InjectMocks
  private WorkoutController workoutController;

  private final UUID userId = UUID.randomUUID();
  private static final String AUTH_HEADER = "Bearer test-token";

  private WorkoutSubmissionDTO submission(String key) {
    return WorkoutSubmissionDTO.builder()
      .name("Leg day")
      .idempotencyKey(key)
      .build();
  }

  @Test
  void duplicateRaceRecoversWithExistingWorkout() {
    String key = "race-key";
    WorkoutDetailDTO existing = WorkoutDetailDTO.builder()
      .workoutId(UUID.randomUUID())
      .name("Leg day")
      .build();

    when(jwtService.extractUserId("test-token")).thenReturn(userId);
    when(workoutService.submitWorkout(any(), eq(userId))).thenThrow(
      new DataIntegrityViolationException("uq_workout_user_idempotency_key")
    );
    when(
      workoutService.getWorkoutDetailsByIdempotencyKey(userId, key)
    ).thenReturn(existing);

    ResponseEntity<WorkoutDetailDTO> response =
      workoutController.submitWorkout(submission(key), AUTH_HEADER);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getWorkoutId()).isEqualTo(
      existing.getWorkoutId()
    );
  }

  @Test
  void integrityViolationWithoutRecoverableKeyStays500() {
    when(jwtService.extractUserId("test-token")).thenReturn(userId);
    when(workoutService.submitWorkout(any(), eq(userId))).thenThrow(
      new DataIntegrityViolationException("some other constraint")
    );
    when(
      workoutService.getWorkoutDetailsByIdempotencyKey(userId, null)
    ).thenReturn(null);

    ResponseEntity<WorkoutDetailDTO> response =
      workoutController.submitWorkout(submission(null), AUTH_HEADER);

    assertThat(response.getStatusCode()).isEqualTo(
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
