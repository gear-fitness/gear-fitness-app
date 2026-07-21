package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.LocationPageDTO;
import com.gearfitness.gear_api.dto.LocationSearchResultDTO;
import com.gearfitness.gear_api.dto.LocationSummaryDTO;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.LocationPageService;
import com.gearfitness.gear_api.service.LocationSearchService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
@Slf4j
public class LocationController {

  private final LocationSearchService locationSearchService;
  private final LocationPageService locationPageService;
  private final JwtService jwtService;

  /**
   * Resolve the caller's id from the bearer token, or null if extraction
   * fails. Callers turn a null into a 401 so a bad token never falls through
   * as a 500.
   */
  private UUID resolveUserId(String authHeader) {
    try {
      return jwtService.extractUserId(authHeader.substring(7));
    } catch (Exception e) {
      log.warn("JWT extraction failed: {}", e.getMessage());
      return null;
    }
  }

  /**
   * Gym search for the workout location picker. query, lat and lng are each
   * optional but at least a query or a coordinate pair must be present:
   * query-only -> text search, coords-only -> nearby gyms ranked by
   * distance, both -> text search biased to the caller. Degrades to the
   * local location table when the Places API is unavailable, so this never
   * 5xxes just because the paid path is down.
   */
  @GetMapping("/search")
  public ResponseEntity<List<LocationSearchResultDTO>> search(
    @RequestHeader("Authorization") String authHeader,
    @RequestParam(required = false) String query,
    @RequestParam(required = false) Double lat,
    @RequestParam(required = false) Double lng
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    return ResponseEntity.ok(
      locationSearchService.search(userId, query, lat, lng)
    );
  }

  /**
   * Social-tab gym search: only gyms with at least one publicly visible
   * post, ranked by post count. Distinct from /search, which is the workout
   * picker's Places-backed lookup of any gym in the world.
   */
  @GetMapping("/tagged-search")
  public ResponseEntity<List<LocationSummaryDTO>> taggedSearch(
    @RequestHeader("Authorization") String authHeader,
    @RequestParam String query
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    return ResponseEntity.ok(locationPageService.searchTagged(query));
  }

  /** Gym page header: identity plus visible post/athlete counts. */
  @GetMapping("/{locationId}")
  public ResponseEntity<LocationPageDTO> getLocationPage(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID locationId
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    return ResponseEntity.ok(locationPageService.getLocationPage(locationId));
  }
}
