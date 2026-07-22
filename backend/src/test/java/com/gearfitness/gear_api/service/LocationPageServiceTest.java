package com.gearfitness.gear_api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.gearfitness.gear_api.dto.FollowerDTO;
import com.gearfitness.gear_api.dto.LocationFriendDTO;
import com.gearfitness.gear_api.dto.LocationPageDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Follow;
import com.gearfitness.gear_api.entity.Location;
import com.gearfitness.gear_api.repository.FollowRepository;
import com.gearfitness.gear_api.repository.LocationRepository;
import com.gearfitness.gear_api.repository.LocationRepository.LocationStats;
import com.gearfitness.gear_api.repository.PostRepository;
import com.gearfitness.gear_api.repository.PostRepository.FriendAtLocation;
import com.gearfitness.gear_api.repository.WorkoutRepository;
import java.time.LocalDateTime;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class LocationPageServiceTest {

  @Mock
  private LocationRepository locationRepository;

  @Mock
  private WorkoutRepository workoutRepository;

  @Mock
  private PostRepository postRepository;

  @Mock
  private FollowRepository followRepository;

  @InjectMocks
  private LocationPageService locationPageService;

  private final UUID locationId = UUID.randomUUID();
  private final UUID viewerId = UUID.randomUUID();

  private static LocationStats stats(long postCount, long athleteCount) {
    return new LocationStats() {
      @Override
      public Long getPostCount() {
        return postCount;
      }

      @Override
      public Long getAthleteCount() {
        return athleteCount;
      }
    };
  }

  private static FriendAtLocation friend(UUID userId, String username) {
    return new FriendAtLocation() {
      @Override
      public UUID getUserId() {
        return userId;
      }

      @Override
      public String getUsername() {
        return username;
      }

      @Override
      public String getDisplayName() {
        return username + " Display";
      }

      @Override
      public String getProfilePictureUrl() {
        return "avatars/" + username + ".jpg";
      }

      @Override
      public LocalDateTime getLastPostedAt() {
        return LocalDateTime.of(2026, 1, 1, 10, 0);
      }
    };
  }

  @BeforeEach
  void stubLocation() {
    when(locationRepository.findById(locationId)).thenReturn(
      Optional.of(
        Location.builder().locationId(locationId).name("Iron Temple").build()
      )
    );
    // lenient: the lifters/mutuals tests never build the page header, and the
    // mapping tests replace these defaults with their own stubs — either
    // would otherwise trip strict-stubbing.
    lenient()
      .when(locationRepository.getStats(locationId))
      .thenReturn(stats(5, 99));
    lenient()
      .when(postRepository.countLiftersAt(eq(locationId), any(UUID.class)))
      .thenReturn(3L);
    lenient()
      .when(
        postRepository.findFriendsWhoTrainAt(
          eq(locationId),
          any(UUID.class),
          any(Pageable.class)
        )
      )
      .thenReturn(Page.empty());
  }

  @Test
  void viewerWithWorkoutsHereGetsTheirOwnCount() {
    when(
      workoutRepository.countByUser_UserIdAndLocation_LocationId(
        viewerId,
        locationId
      )
    ).thenReturn(7L);

    LocationPageDTO dto = locationPageService.getLocationPage(
      locationId,
      viewerId
    );

    assertThat(dto.getViewerWorkoutCount()).isEqualTo(7L);
    // The other counts are unaffected by the personal stat.
    assertThat(dto.getPostCount()).isEqualTo(5L);
    assertThat(dto.getAthleteCount()).isEqualTo(3L);
  }

  @Test
  void athleteCountIsTheViewerAwareLiftersCount() {
    // The header stat opens the Lifters list, so it must be the same
    // viewer-scoped count that list uses — not the discover-grade stats
    // figure (stubbed to a distinctly wrong 99 in setup).
    when(postRepository.countLiftersAt(locationId, viewerId)).thenReturn(4L);
    when(
      workoutRepository.countByUser_UserIdAndLocation_LocationId(
        viewerId,
        locationId
      )
    ).thenReturn(0L);

    LocationPageDTO dto = locationPageService.getLocationPage(
      locationId,
      viewerId
    );

    assertThat(dto.getAthleteCount()).isEqualTo(4L);
    verify(postRepository).countLiftersAt(locationId, viewerId);
  }

  @Test
  void viewerWhoNeverTrainedHereGetsZero() {
    when(
      workoutRepository.countByUser_UserIdAndLocation_LocationId(
        viewerId,
        locationId
      )
    ).thenReturn(0L);

    LocationPageDTO dto = locationPageService.getLocationPage(
      locationId,
      viewerId
    );

    assertThat(dto.getViewerWorkoutCount()).isZero();
  }

  @Test
  void countIsScopedToTheRequestingViewerOnly() {
    // Two different viewers of the same gym page: each must get a count
    // derived from their own id, never see the other's.
    UUID otherViewerId = UUID.randomUUID();
    when(
      workoutRepository.countByUser_UserIdAndLocation_LocationId(
        viewerId,
        locationId
      )
    ).thenReturn(7L);
    when(
      workoutRepository.countByUser_UserIdAndLocation_LocationId(
        otherViewerId,
        locationId
      )
    ).thenReturn(0L);

    LocationPageDTO regular = locationPageService.getLocationPage(
      locationId,
      viewerId
    );
    LocationPageDTO firstTimer = locationPageService.getLocationPage(
      locationId,
      otherViewerId
    );

    assertThat(regular.getViewerWorkoutCount()).isEqualTo(7L);
    assertThat(firstTimer.getViewerWorkoutCount()).isZero();
    verify(workoutRepository).countByUser_UserIdAndLocation_LocationId(
      viewerId,
      locationId
    );
    verify(workoutRepository).countByUser_UserIdAndLocation_LocationId(
      otherViewerId,
      locationId
    );
  }

  @Test
  void friendsSectionIsMappedInRepositoryOrderWithTheTrueTotal() {
    UUID alexId = UUID.randomUUID();
    UUID samId = UUID.randomUUID();
    // Repository returns a capped first page (2 shown) of 5 qualifiers. The
    // page size must match the content size here or PageImpl "corrects" the
    // total down to what would fit.
    when(
      postRepository.findFriendsWhoTrainAt(
        eq(locationId),
        eq(viewerId),
        any(Pageable.class)
      )
    ).thenReturn(
      new PageImpl<>(
        List.of(friend(alexId, "alex"), friend(samId, "sam")),
        PageRequest.of(0, 2),
        5
      )
    );

    LocationPageDTO dto = locationPageService.getLocationPage(
      locationId,
      viewerId
    );

    assertThat(dto.getFriendsWhoTrainHere())
      .extracting(
        LocationFriendDTO::getUserId,
        LocationFriendDTO::getUsername,
        LocationFriendDTO::getDisplayName,
        LocationFriendDTO::getProfilePictureUrl
      )
      .containsExactly(
        tuple(alexId, "alex", "alex Display", "avatars/alex.jpg"),
        tuple(samId, "sam", "sam Display", "avatars/sam.jpg")
      );
    assertThat(dto.getFriendsWhoTrainHereCount()).isEqualTo(5L);
  }

  @Test
  void friendsAreFetchedForTheViewerWithTheDisplayCap() {
    locationPageService.getLocationPage(locationId, viewerId);

    ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
    verify(postRepository).findFriendsWhoTrainAt(
      eq(locationId),
      eq(viewerId),
      pageable.capture()
    );
    assertThat(pageable.getValue().getPageNumber()).isZero();
    assertThat(pageable.getValue().getPageSize()).isEqualTo(10);
  }

  @Test
  void noQualifyingFriendsYieldsAnEmptyListAndZeroCount() {
    LocationPageDTO dto = locationPageService.getLocationPage(
      locationId,
      viewerId
    );

    assertThat(dto.getFriendsWhoTrainHere()).isEmpty();
    assertThat(dto.getFriendsWhoTrainHereCount()).isZero();
  }

  private static Follow edge(
    UUID followerId,
    UUID followeeId,
    Follow.FollowStatus status
  ) {
    return Follow.builder()
      .follower(AppUser.builder().userId(followerId).build())
      .followee(AppUser.builder().userId(followeeId).build())
      .status(status)
      .build();
  }

  @Test
  void liftersRowsCarryTheViewersRealFollowStatus() {
    // The Lifters tab mixes followed and non-followed people, so each row's
    // button state must reflect the viewer's actual edge toward them.
    UUID followedId = UUID.randomUUID();
    UUID strangerId = UUID.randomUUID();
    when(
      postRepository.findLiftersAt(
        eq(locationId),
        eq(viewerId),
        any(Pageable.class)
      )
    ).thenReturn(
      new PageImpl<>(
        List.of(friend(followedId, "followed"), friend(strangerId, "stranger"))
      )
    );
    when(followRepository.findViewerEdgesToward(eq(viewerId), any())).thenReturn(
      List.of(edge(viewerId, followedId, Follow.FollowStatus.ACCEPTED))
    );

    List<FollowerDTO> rows = locationPageService.getLifters(
      locationId,
      viewerId
    );

    assertThat(rows)
      .extracting(
        FollowerDTO::getUserId,
        FollowerDTO::getFollowStatus,
        FollowerDTO::isFollowing
      )
      .containsExactly(
        tuple(followedId, "ACCEPTED", true),
        tuple(strangerId, "NONE", false)
      );
  }

  @Test
  void gymMutualsAreTheFriendsWhoTrainHereQueryUncapped() {
    // The Mutuals tab must show every qualifying followed lifter (not the
    // header's capped 10) and must be the same query as the header section,
    // so the "and N others" figure always matches this list.
    UUID friendId = UUID.randomUUID();
    when(
      postRepository.findFriendsWhoTrainAt(
        eq(locationId),
        eq(viewerId),
        any(Pageable.class)
      )
    ).thenReturn(new PageImpl<>(List.of(friend(friendId, "friend"))));
    when(followRepository.findViewerEdgesToward(eq(viewerId), any())).thenReturn(
      List.of(edge(viewerId, friendId, Follow.FollowStatus.ACCEPTED))
    );

    List<FollowerDTO> rows = locationPageService.getLifterMutuals(
      locationId,
      viewerId
    );

    ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
    verify(postRepository).findFriendsWhoTrainAt(
      eq(locationId),
      eq(viewerId),
      pageable.capture()
    );
    assertThat(pageable.getValue().isUnpaged()).isTrue();
    assertThat(rows).extracting(FollowerDTO::getUserId).containsExactly(
      friendId
    );
    assertThat(rows.get(0).isFollowing()).isTrue();
  }

  @Test
  void emptyLiftersListSkipsTheFollowLookup() {
    when(
      postRepository.findLiftersAt(
        eq(locationId),
        eq(viewerId),
        any(Pageable.class)
      )
    ).thenReturn(Page.empty());

    assertThat(locationPageService.getLifters(locationId, viewerId)).isEmpty();
    verify(followRepository, never()).findViewerEdgesToward(any(), any());
  }
}
