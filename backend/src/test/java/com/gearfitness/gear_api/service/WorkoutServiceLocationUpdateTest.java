package com.gearfitness.gear_api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.gearfitness.gear_api.dto.WorkoutSubmissionDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Location;
import com.gearfitness.gear_api.entity.Workout;
import com.gearfitness.gear_api.repository.LocationRepository;
import com.gearfitness.gear_api.repository.WorkoutRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Post-publish gym-tag edits: owner can change or clear the tag, non-owners
 * are rejected, re-tagging dedupes against existing location rows, and
 * removal never deletes the shared location row.
 */
@ExtendWith(MockitoExtension.class)
class WorkoutServiceLocationUpdateTest {

  @Mock
  private WorkoutRepository workoutRepository;

  @Mock
  private LocationRepository locationRepository;

  @InjectMocks
  private WorkoutService workoutService;

  private final UUID ownerId = UUID.randomUUID();
  private final UUID workoutId = UUID.randomUUID();

  private Workout workout(Location location) {
    return Workout.builder()
      .workoutId(workoutId)
      .user(AppUser.builder().userId(ownerId).build())
      .name("Push day")
      .location(location)
      .build();
  }

  private Location existingGym() {
    return Location.builder()
      .locationId(UUID.randomUUID())
      .name("Iron Temple")
      .googlePlaceId("place-123")
      .build();
  }

  private WorkoutSubmissionDTO.LocationSubmissionDTO dto(
    String placeId,
    String name
  ) {
    return new WorkoutSubmissionDTO.LocationSubmissionDTO(
      placeId,
      name,
      null,
      null,
      null
    );
  }

  @Test
  void ownerCanChangeTag() {
    Workout workout = workout(existingGym());
    Location newGym = Location.builder()
      .locationId(UUID.randomUUID())
      .name("Sunset Fitness")
      .googlePlaceId("place-456")
      .build();
    when(workoutRepository.findById(workoutId)).thenReturn(
      Optional.of(workout)
    );
    when(locationRepository.findByGooglePlaceId("place-456")).thenReturn(
      Optional.of(newGym)
    );

    Location result = workoutService.updateWorkoutLocation(
      workoutId,
      ownerId,
      dto("place-456", "Sunset Fitness")
    );

    assertThat(result).isEqualTo(newGym);
    ArgumentCaptor<Workout> captor = ArgumentCaptor.forClass(Workout.class);
    verify(workoutRepository).save(captor.capture());
    assertThat(captor.getValue().getLocation()).isEqualTo(newGym);
  }

  @Test
  void ownerCanRemoveTagWithoutDeletingTheGym() {
    Workout workout = workout(existingGym());
    when(workoutRepository.findById(workoutId)).thenReturn(
      Optional.of(workout)
    );

    Location result = workoutService.updateWorkoutLocation(
      workoutId,
      ownerId,
      null
    );

    assertThat(result).isNull();
    ArgumentCaptor<Workout> captor = ArgumentCaptor.forClass(Workout.class);
    verify(workoutRepository).save(captor.capture());
    assertThat(captor.getValue().getLocation()).isNull();
    // Other posts may reference the gym: the shared row must survive untags.
    verify(locationRepository, never()).delete(any());
    verify(locationRepository, never()).deleteById(any());
  }

  @Test
  void nonOwnerIsRejected() {
    Workout workout = workout(existingGym());
    when(workoutRepository.findById(workoutId)).thenReturn(
      Optional.of(workout)
    );
    UUID strangerId = UUID.randomUUID();

    assertThatThrownBy(() ->
      workoutService.updateWorkoutLocation(
        workoutId,
        strangerId,
        dto("place-456", "Sunset Fitness")
      )
    )
      .isInstanceOf(ResponseStatusException.class)
      .satisfies(e ->
        assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(
          HttpStatus.FORBIDDEN
        )
      );

    verify(workoutRepository, never()).save(any());
  }

  @Test
  void unknownWorkoutIsNotFound() {
    when(workoutRepository.findById(workoutId)).thenReturn(Optional.empty());

    assertThatThrownBy(() ->
      workoutService.updateWorkoutLocation(
        workoutId,
        ownerId,
        dto("place-456", "Sunset Fitness")
      )
    )
      .isInstanceOf(ResponseStatusException.class)
      .satisfies(e ->
        assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(
          HttpStatus.NOT_FOUND
        )
      );
  }

  @Test
  void retaggingByPlaceIdReusesExistingGym() {
    Workout workout = workout(null);
    Location existing = existingGym();
    when(workoutRepository.findById(workoutId)).thenReturn(
      Optional.of(workout)
    );
    when(locationRepository.findByGooglePlaceId("place-123")).thenReturn(
      Optional.of(existing)
    );

    Location result = workoutService.updateWorkoutLocation(
      workoutId,
      ownerId,
      dto("place-123", "Iron Temple")
    );

    assertThat(result).isEqualTo(existing);
    // Dedup: the known gym is reused, never re-created.
    verify(locationRepository, never()).save(any());
  }

  @Test
  void retaggingManualEntryDedupesByNameIgnoringCase() {
    Workout workout = workout(null);
    Location existing = Location.builder()
      .locationId(UUID.randomUUID())
      .name("Garage Gainz")
      .googlePlaceId(null)
      .build();
    when(workoutRepository.findById(workoutId)).thenReturn(
      Optional.of(workout)
    );
    when(
      locationRepository.findFirstByGooglePlaceIdIsNullAndNameIgnoreCase(
        "garage gainz"
      )
    ).thenReturn(Optional.of(existing));

    Location result = workoutService.updateWorkoutLocation(
      workoutId,
      ownerId,
      dto(null, "  garage gainz  ")
    );

    assertThat(result).isEqualTo(existing);
    verify(locationRepository, never()).save(any());
  }

  @Test
  void retaggingUnknownGymCreatesItAttributedToOwner() {
    Workout workout = workout(null);
    when(workoutRepository.findById(workoutId)).thenReturn(
      Optional.of(workout)
    );
    when(
      locationRepository.findFirstByGooglePlaceIdIsNullAndNameIgnoreCase(
        "New Spot"
      )
    ).thenReturn(Optional.empty());
    when(locationRepository.save(any(Location.class))).thenAnswer(inv -> {
      Location l = inv.getArgument(0);
      l.setLocationId(UUID.randomUUID());
      return l;
    });

    Location result = workoutService.updateWorkoutLocation(
      workoutId,
      ownerId,
      dto(null, "New Spot")
    );

    assertThat(result.getName()).isEqualTo("New Spot");
    assertThat(result.getCreatedBy()).isEqualTo(ownerId);
    ArgumentCaptor<Workout> captor = ArgumentCaptor.forClass(Workout.class);
    verify(workoutRepository).save(captor.capture());
    assertThat(captor.getValue().getLocation()).isEqualTo(result);
  }
}
