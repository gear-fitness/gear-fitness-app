package com.gearfitness.gear_api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.gearfitness.gear_api.dto.WorkoutSubmissionDTO;
import com.gearfitness.gear_api.entity.Location;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.S3StorageService;
import com.gearfitness.gear_api.service.WorkoutService;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class WorkoutControllerLocationTest {

  @Mock
  private WorkoutService workoutService;

  @Mock
  private JwtService jwtService;

  @Mock
  private S3StorageService s3StorageService;

  @InjectMocks
  private WorkoutController workoutController;

  private final UUID userId = UUID.randomUUID();
  private final UUID workoutId = UUID.randomUUID();
  private static final String AUTH_HEADER = "Bearer test-token";

  private WorkoutSubmissionDTO.LocationSubmissionDTO dto(String name) {
    return new WorkoutSubmissionDTO.LocationSubmissionDTO(
      "place-123",
      name,
      null,
      null,
      null
    );
  }

  @Test
  void patchReturnsTheResolvedLocation() {
    UUID locationId = UUID.randomUUID();
    when(jwtService.extractUserId("test-token")).thenReturn(userId);
    when(
      workoutService.updateWorkoutLocation(
        eq(workoutId),
        eq(userId),
        any(WorkoutSubmissionDTO.LocationSubmissionDTO.class)
      )
    ).thenReturn(
      Location.builder().locationId(locationId).name("Iron Temple").build()
    );

    ResponseEntity<?> response = workoutController.updateWorkoutLocation(
      workoutId,
      AUTH_HEADER,
      dto("Iron Temple")
    );

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).isEqualTo(
      Map.of("locationId", locationId, "locationName", "Iron Temple")
    );
  }

  @Test
  void patchWithBlankNameIsRejectedWithoutTouchingTheWorkout() {
    when(jwtService.extractUserId("test-token")).thenReturn(userId);

    ResponseEntity<?> response = workoutController.updateWorkoutLocation(
      workoutId,
      AUTH_HEADER,
      dto("   ")
    );

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    verify(workoutService, never()).updateWorkoutLocation(any(), any(), any());
  }

  @Test
  void deleteClearsTheTag() {
    when(jwtService.extractUserId("test-token")).thenReturn(userId);

    ResponseEntity<Void> response = workoutController.removeWorkoutLocation(
      workoutId,
      AUTH_HEADER
    );

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    verify(workoutService).updateWorkoutLocation(
      eq(workoutId),
      eq(userId),
      isNull()
    );
  }

  @Test
  void ownershipRejectionPropagatesAsForbidden() {
    when(jwtService.extractUserId("test-token")).thenReturn(userId);
    when(
      workoutService.updateWorkoutLocation(
        eq(workoutId),
        eq(userId),
        any(WorkoutSubmissionDTO.LocationSubmissionDTO.class)
      )
    ).thenThrow(
      new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your workout")
    );

    // Deliberately uncaught in the controller: Spring maps it to a 403.
    assertThatThrownBy(() ->
      workoutController.updateWorkoutLocation(
        workoutId,
        AUTH_HEADER,
        dto("Iron Temple")
      )
    )
      .isInstanceOf(ResponseStatusException.class)
      .satisfies(e ->
        assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(
          HttpStatus.FORBIDDEN
        )
      );
  }
}
