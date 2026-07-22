package com.gearfitness.gear_api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.gearfitness.gear_api.dto.FollowerDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Follow;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.FollowRepository;
import com.gearfitness.gear_api.repository.NotificationRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Mapping tests for the profile Mutuals tab's service layer. The set logic
 * itself (viewer-follows ∩ profile-followers) is covered against a real
 * database in FollowRepositoryMutualsTest.
 */
@ExtendWith(MockitoExtension.class)
class FollowServiceMutualsTest {

  @Mock
  private FollowRepository followRepository;

  @Mock
  private AppUserRepository userRepository;

  @Mock
  private NotificationRepository notificationRepository;

  @Mock
  private ExpoPushService expoPushService;

  @InjectMocks
  private FollowService followService;

  private final UUID profileUserId = UUID.randomUUID();
  private final UUID currentUserId = UUID.randomUUID();

  private static Follow edgeTo(UUID viewerId, String username) {
    return Follow.builder()
      .follower(AppUser.builder().userId(viewerId).build())
      .followee(
        AppUser.builder()
          .userId(UUID.randomUUID())
          .username(username)
          .displayName(username + " Display")
          .profilePictureUrl("avatars/" + username + ".jpg")
          .build()
      )
      .status(Follow.FollowStatus.ACCEPTED)
      .build();
  }

  @Test
  void mutualsAreMappedAsAlreadyFollowedRows() {
    when(userRepository.findById(profileUserId)).thenReturn(
      Optional.of(AppUser.builder().userId(profileUserId).build())
    );
    when(followRepository.findMutuals(currentUserId, profileUserId)).thenReturn(
      List.of(edgeTo(currentUserId, "alex"), edgeTo(currentUserId, "sam"))
    );

    List<FollowerDTO> mutuals = followService.getMutuals(
      profileUserId,
      currentUserId
    );

    // Every mutual is by definition someone the viewer follows, so each row
    // must render as "Following".
    assertThat(mutuals)
      .extracting(
        FollowerDTO::getUsername,
        FollowerDTO::getDisplayName,
        FollowerDTO::getFollowStatus,
        FollowerDTO::isFollowing
      )
      .containsExactly(
        tuple("alex", "alex Display", "ACCEPTED", true),
        tuple("sam", "sam Display", "ACCEPTED", true)
      );
  }

  @Test
  void unknownProfileUserIsRejectedBeforeQuerying() {
    when(userRepository.findById(profileUserId)).thenReturn(Optional.empty());

    assertThatThrownBy(() ->
      followService.getMutuals(profileUserId, currentUserId)
    ).hasMessage("User not found");
    verify(followRepository, never()).findMutuals(any(), any());
  }
}
