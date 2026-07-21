package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.LocationFriendDTO;
import com.gearfitness.gear_api.dto.LocationPageDTO;
import com.gearfitness.gear_api.dto.LocationSummaryDTO;
import com.gearfitness.gear_api.entity.Location;
import com.gearfitness.gear_api.repository.LocationRepository;
import com.gearfitness.gear_api.repository.LocationRepository.LocationStats;
import com.gearfitness.gear_api.repository.PostRepository;
import com.gearfitness.gear_api.repository.PostRepository.FriendAtLocation;
import com.gearfitness.gear_api.repository.WorkoutRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
  private static final int FRIENDS_DISPLAY_LIMIT = 10;

  private final LocationRepository locationRepository;
  private final WorkoutRepository workoutRepository;
  private final PostRepository postRepository;

  /**
   * viewerId must be the authenticated caller's id: viewerWorkoutCount is
   * their private training history at this gym (all their workouts, whatever
   * each post's visibility), so computing it for anyone else would leak it —
   * and friendsWhoTrainHere is derived from the caller's own follow graph
   * and post-visibility rules.
   */
  @Transactional(readOnly = true)
  public LocationPageDTO getLocationPage(UUID locationId, UUID viewerId) {
    Location location = locationRepository
      .findById(locationId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found")
      );
    LocationStats stats = locationRepository.getStats(locationId);
    // First page only: the section shows at most FRIENDS_DISPLAY_LIMIT
    // people; the page's total still reflects everyone who qualifies.
    Page<FriendAtLocation> friends = postRepository.findFriendsWhoTrainAt(
      locationId,
      viewerId,
      PageRequest.of(0, FRIENDS_DISPLAY_LIMIT)
    );
    return LocationPageDTO.builder()
      .locationId(location.getLocationId())
      .name(location.getName())
      .address(location.getAddress())
      .latitude(location.getLatitude())
      .longitude(location.getLongitude())
      .postCount(stats.getPostCount())
      .athleteCount(stats.getAthleteCount())
      .viewerWorkoutCount(
        workoutRepository.countByUser_UserIdAndLocation_LocationId(
          viewerId,
          locationId
        )
      )
      .friendsWhoTrainHere(
        friends
          .getContent()
          .stream()
          .map(friend ->
            LocationFriendDTO.builder()
              .userId(friend.getUserId())
              .username(friend.getUsername())
              .displayName(friend.getDisplayName())
              .profilePictureUrl(friend.getProfilePictureUrl())
              .build()
          )
          .toList()
      )
      .friendsWhoTrainHereCount(friends.getTotalElements())
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
