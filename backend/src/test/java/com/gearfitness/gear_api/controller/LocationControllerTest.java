package com.gearfitness.gear_api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.gearfitness.gear_api.dto.FollowerDTO;
import com.gearfitness.gear_api.dto.LocationPageDTO;
import java.util.List;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.LocationPageService;
import com.gearfitness.gear_api.service.LocationSearchService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class LocationControllerTest {

  @Mock
  private LocationSearchService locationSearchService;

  @Mock
  private LocationPageService locationPageService;

  @Mock
  private JwtService jwtService;

  @InjectMocks
  private LocationController locationController;

  private final UUID userId = UUID.randomUUID();
  private final UUID locationId = UUID.randomUUID();
  private static final String AUTH_HEADER = "Bearer test-token";

  @Test
  void locationPageIsBuiltForTheTokensUser() {
    // The personal viewerWorkoutCount must come from the caller's own token
    // identity — the service is handed exactly that id and no other.
    LocationPageDTO dto = LocationPageDTO.builder()
      .locationId(locationId)
      .name("Iron Temple")
      .postCount(5L)
      .athleteCount(3L)
      .viewerWorkoutCount(7L)
      .build();
    when(jwtService.extractUserId("test-token")).thenReturn(userId);
    when(locationPageService.getLocationPage(locationId, userId)).thenReturn(
      dto
    );

    ResponseEntity<LocationPageDTO> response =
      locationController.getLocationPage(AUTH_HEADER, locationId);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).isSameAs(dto);
    verify(locationPageService).getLocationPage(locationId, userId);
  }

  @Test
  void badTokenIsUnauthorizedWithoutTouchingTheService() {
    when(jwtService.extractUserId("test-token")).thenThrow(
      new IllegalArgumentException("bad token")
    );

    ResponseEntity<LocationPageDTO> response =
      locationController.getLocationPage(AUTH_HEADER, locationId);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    verify(locationPageService, never()).getLocationPage(any(), any());
  }

  @Test
  void lifterListsAreBuiltForTheTokensUser() {
    // Both gym lists are viewer-dependent (the follow graph widens what's
    // visible), so the viewer identity must come from the token.
    List<FollowerDTO> lifters = List.of(
      new FollowerDTO(UUID.randomUUID(), "alex", "Alex", null, "NONE")
    );
    List<FollowerDTO> mutuals = List.of(
      new FollowerDTO(UUID.randomUUID(), "sam", "Sam", null, "ACCEPTED")
    );
    when(jwtService.extractUserId("test-token")).thenReturn(userId);
    when(locationPageService.getLifters(locationId, userId)).thenReturn(
      lifters
    );
    when(locationPageService.getLifterMutuals(locationId, userId)).thenReturn(
      mutuals
    );

    ResponseEntity<List<FollowerDTO>> liftersResponse =
      locationController.getLifters(AUTH_HEADER, locationId);
    ResponseEntity<List<FollowerDTO>> mutualsResponse =
      locationController.getLifterMutuals(AUTH_HEADER, locationId);

    assertThat(liftersResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(liftersResponse.getBody()).isSameAs(lifters);
    assertThat(mutualsResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(mutualsResponse.getBody()).isSameAs(mutuals);
  }

  @Test
  void badTokenIsUnauthorizedForTheLifterLists() {
    when(jwtService.extractUserId("test-token")).thenThrow(
      new IllegalArgumentException("bad token")
    );

    assertThat(
      locationController.getLifters(AUTH_HEADER, locationId).getStatusCode()
    ).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(
      locationController
        .getLifterMutuals(AUTH_HEADER, locationId)
        .getStatusCode()
    ).isEqualTo(HttpStatus.UNAUTHORIZED);
    verify(locationPageService, never()).getLifters(any(), any());
    verify(locationPageService, never()).getLifterMutuals(any(), any());
  }
}
