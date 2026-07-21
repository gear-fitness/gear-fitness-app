package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.LocationPageDTO;
import com.gearfitness.gear_api.dto.LocationSummaryDTO;
import com.gearfitness.gear_api.entity.Location;
import com.gearfitness.gear_api.repository.LocationRepository;
import com.gearfitness.gear_api.repository.LocationRepository.LocationStats;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Gym location pages: the header data and the Social-tab gym search. The
 * posts themselves come from SocialFeedService.getLocationPosts so they share
 * the feed's DTO mapping and audience rules.
 */
@Service
@RequiredArgsConstructor
public class LocationPageService {

  private static final int SEARCH_LIMIT = 10;

  private final LocationRepository locationRepository;

  @Transactional(readOnly = true)
  public LocationPageDTO getLocationPage(UUID locationId) {
    Location location = locationRepository
      .findById(locationId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found")
      );
    LocationStats stats = locationRepository.getStats(locationId);
    return LocationPageDTO.builder()
      .locationId(location.getLocationId())
      .name(location.getName())
      .address(location.getAddress())
      .latitude(location.getLatitude())
      .longitude(location.getLongitude())
      .postCount(stats.getPostCount())
      .athleteCount(stats.getAthleteCount())
      .build();
  }

  @Transactional(readOnly = true)
  public List<LocationSummaryDTO> searchTagged(String rawQuery) {
    String query = rawQuery == null ? "" : rawQuery.trim();
    if (query.isEmpty()) {
      return List.of();
    }
    return locationRepository
      .searchTagged(query, SEARCH_LIMIT)
      .stream()
      .map(row ->
        LocationSummaryDTO.builder()
          .locationId(row.getLocationId())
          .name(row.getName())
          .address(row.getAddress())
          .postCount(row.getPostCount())
          .build()
      )
      .toList();
  }
}
