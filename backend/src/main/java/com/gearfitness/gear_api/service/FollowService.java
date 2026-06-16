package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.FollowActivityDTO;
import com.gearfitness.gear_api.dto.FollowResponse;
import com.gearfitness.gear_api.dto.FollowerDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Follow;
import com.gearfitness.gear_api.entity.Notification;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.FollowRepository;
import com.gearfitness.gear_api.repository.NotificationRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FollowService {

  private final FollowRepository followRepository;
  private final AppUserRepository userRepository;
  private final NotificationRepository notificationRepository;
  private final ExpoPushService expoPushService;

  /**
   * Follow a user
   * Creates a follow relationship with ACCEPTED or PENDING status
   */
  @Transactional
  public FollowResponse followUser(UUID followerId, UUID followeeId) {
    if (followerId.equals(followeeId)) {
      throw new RuntimeException("Cannot follow yourself");
    }

    AppUser follower = userRepository
      .findById(followerId)
      .orElseThrow(() -> new RuntimeException("Follower user not found"));

    AppUser followee = userRepository
      .findById(followeeId)
      .orElseThrow(() -> new RuntimeException("User to follow not found"));

    Optional<Follow> existing = followRepository.findByFollowerAndFollowee(
      follower,
      followee
    );

    // If already following (any status), return current status gracefully
    if (existing.isPresent()) {
      Follow.FollowStatus existingStatus = existing.get().getStatus();
      if (existingStatus == Follow.FollowStatus.BLOCKED) {
        throw new RuntimeException("Cannot follow this user");
      }
      return FollowResponse.builder()
        .followeeId(followeeId)
        .followeeUsername(followee.getUsername())
        .status(existingStatus.name())
        .message(
          existingStatus == Follow.FollowStatus.PENDING
            ? "Follow request already sent to " + followee.getUsername()
            : "Already following " + followee.getUsername()
        )
        .build();
    }

    // Reject if a block relationship exists in either direction
    if (followRepository.existsBlockBetween(followerId, followeeId)) {
      throw new RuntimeException("Cannot follow this user");
    }

    // Use Boolean.TRUE.equals to safely handle null isPrivate
    Follow.FollowStatus status = Boolean.TRUE.equals(followee.getIsPrivate())
      ? Follow.FollowStatus.PENDING
      : Follow.FollowStatus.ACCEPTED;

    Follow follow = Follow.builder()
      .follower(follower)
      .followee(followee)
      .status(status)
      .createdAt(LocalDateTime.now())
      .respondedAt(
        status == Follow.FollowStatus.ACCEPTED ? LocalDateTime.now() : null
      )
      .build();

    followRepository.save(follow);

    // FOLLOW_REQUEST for private accounts, FOLLOW for public accounts
    Notification.NotificationType notifType =
      status == Follow.FollowStatus.PENDING
        ? Notification.NotificationType.FOLLOW_REQUEST
        : Notification.NotificationType.FOLLOW;

    Notification notification = Notification.builder()
      .recipient(followee)
      .actor(follower)
      .type(notifType)
      .build();

    notificationRepository.save(notification);

    if (status == Follow.FollowStatus.ACCEPTED) {
      String data = String.format(
        """
        {"type":"FOLLOW","screen":"UserProfile","params":{"username":"%s"}}
        """,
        follower.getUsername()
      );
      expoPushService.sendPushNotification(
        followee.getExpoPushToken(),
        "New Follower",
        follower.getUsername() + " started following you",
        data
      );
    } else {
      String data = String.format(
        """
        {"type":"FOLLOW_REQUEST","screen":"UserProfile","params":{"username":"%s"}}
        """,
        follower.getUsername()
      );
      expoPushService.sendPushNotification(
        followee.getExpoPushToken(),
        "Follow Request",
        follower.getUsername() + " wants to follow you",
        data
      );
    }

    return FollowResponse.builder()
      .followeeId(followeeId)
      .followeeUsername(followee.getUsername())
      .status(status.name())
      .message(
        status == Follow.FollowStatus.ACCEPTED
          ? "Now following " + followee.getUsername()
          : "Follow request sent to " + followee.getUsername()
      )
      .build();
  }

  /**
   * Follow a user by username
   */
  @Transactional
  public FollowResponse followUserByUsername(UUID followerId, String username) {
    AppUser followee = userRepository
      .findByUsername(username)
      .orElseThrow(() -> new RuntimeException("User not found: " + username));

    return followUser(followerId, followee.getUserId());
  }

  /**
   * Unfollow a user
   */
  @Transactional
  public void unfollowUser(UUID followerId, UUID followeeId) {
    AppUser follower = userRepository
      .findById(followerId)
      .orElseThrow(() -> new RuntimeException("Follower user not found"));

    AppUser followee = userRepository
      .findById(followeeId)
      .orElseThrow(() -> new RuntimeException("User to unfollow not found"));

    Optional<Follow> follow = followRepository.findByFollowerAndFollowee(
      follower,
      followee
    );
    if (follow.isEmpty()) return; // already not following — treat as success

    followRepository.delete(follow.get());

    // If a pending request is being rescinded, drop the follow-request
    // notification so it disappears from the recipient's activity.
    notificationRepository.deleteByRecipientAndActorAndType(
      followee,
      follower,
      Notification.NotificationType.FOLLOW_REQUEST
    );
  }

  /**
   * Check if a user is following another user
   */
  public boolean isFollowing(UUID followerId, UUID followeeId) {
    AppUser follower = userRepository.findById(followerId).orElse(null);
    AppUser followee = userRepository.findById(followeeId).orElse(null);

    if (follower == null || followee == null) {
      return false;
    }

    return followRepository.existsByFollowerAndFolloweeAndStatus(
      follower,
      followee,
      Follow.FollowStatus.ACCEPTED
    );
  }

  /**
   * Get list of followers for a user
   * Includes isFollowing flag relative to currentUserId
   */
  @Transactional(readOnly = true)
  public List<FollowerDTO> getFollowers(UUID userId, UUID currentUserId) {
    AppUser user = userRepository
      .findById(userId)
      .orElseThrow(() -> new RuntimeException("User not found"));

    AppUser currentUser = userRepository
      .findById(currentUserId)
      .orElseThrow(() -> new RuntimeException("Current user not found"));

    return followRepository
      .findByFolloweeAndStatus(user, Follow.FollowStatus.ACCEPTED)
      .stream()
      .map(f ->
        new FollowerDTO(
          f.getFollower().getUserId(),
          f.getFollower().getUsername(),
          f.getFollower().getDisplayName(),
          f.getFollower().getProfilePictureUrl(),
          viewerStatusToward(currentUser, f.getFollower())
        )
      )
      .collect(Collectors.toList());
  }

  /**
   * Get list of users that this user is following
   * Includes isFollowing flag relative to currentUserId
   */
  @Transactional(readOnly = true)
  public List<FollowerDTO> getFollowing(UUID userId, UUID currentUserId) {
    AppUser user = userRepository
      .findById(userId)
      .orElseThrow(() -> new RuntimeException("User not found"));

    AppUser currentUser = userRepository
      .findById(currentUserId)
      .orElseThrow(() -> new RuntimeException("Current user not found"));

    return followRepository
      .findByFollowerAndStatus(user, Follow.FollowStatus.ACCEPTED)
      .stream()
      .map(f ->
        new FollowerDTO(
          f.getFollowee().getUserId(),
          f.getFollowee().getUsername(),
          f.getFollowee().getDisplayName(),
          f.getFollowee().getProfilePictureUrl(),
          viewerStatusToward(currentUser, f.getFollowee())
        )
      )
      .collect(Collectors.toList());
  }

  /**
   * The viewer's follow relationship toward a target user, as a status string
   * ("ACCEPTED", "PENDING", "BLOCKED", or "NONE"). The viewer is never shown a
   * button for themselves, so self is reported as "NONE".
   */
  private String viewerStatusToward(AppUser viewer, AppUser target) {
    if (viewer.getUserId().equals(target.getUserId())) return "NONE";
    return followRepository
      .findByFollowerAndFollowee(viewer, target)
      .map(f -> f.getStatus().name())
      .orElse("NONE");
  }

  /**
   * Get pending follow requests for a user
   */
  @Transactional(readOnly = true)
  public List<FollowerDTO> getPendingRequests(UUID userId) {
    AppUser user = userRepository
      .findById(userId)
      .orElseThrow(() -> new RuntimeException("User not found"));

    return followRepository
      .findByFolloweeAndStatus(user, Follow.FollowStatus.PENDING)
      .stream()
      .map(f ->
        new FollowerDTO(
          f.getFollower().getUserId(),
          f.getFollower().getUsername(),
          f.getFollower().getDisplayName(),
          f.getFollower().getProfilePictureUrl()
        )
      )
      .collect(Collectors.toList());
  }

  /**
   * Accept a follow request
   */
  @Transactional
  public void acceptFollowRequest(UUID followeeId, UUID followerId) {
    AppUser followee = userRepository
      .findById(followeeId)
      .orElseThrow(() -> new RuntimeException("User not found"));

    AppUser follower = userRepository
      .findById(followerId)
      .orElseThrow(() -> new RuntimeException("Follower not found"));

    Follow follow = followRepository
      .findByFollowerAndFollowee(follower, followee)
      .orElseThrow(() -> new RuntimeException("Follow request not found"));

    follow.setStatus(Follow.FollowStatus.ACCEPTED);
    follow.setRespondedAt(LocalDateTime.now());

    // Replace the pending follow-request notification with a fresh follow
    // notification. Re-creating it (rather than flipping the type in place)
    // stamps the server's GMT creation time at the moment of acceptance, so the
    // activity feed shows "<user> started following you" as a new event ("Just
    // now") instead of inheriting the original request's (now stale) timestamp.
    // createdAt is @CreationTimestamp + updatable=false, so it can't be mutated
    // on the existing row anyway.
    notificationRepository.deleteByRecipientAndActorAndType(
      followee,
      follower,
      Notification.NotificationType.FOLLOW_REQUEST
    );
    notificationRepository.save(
      Notification.builder()
        .recipient(followee)
        .actor(follower)
        .type(Notification.NotificationType.FOLLOW)
        .isRead(true)
        .build()
    );
  }

  /**
   * Decline a follow request
   */
  @Transactional
  public void declineFollowRequest(UUID followeeId, UUID followerId) {
    AppUser followee = userRepository
      .findById(followeeId)
      .orElseThrow(() -> new RuntimeException("User not found"));

    AppUser follower = userRepository
      .findById(followerId)
      .orElseThrow(() -> new RuntimeException("Follower not found"));

    // Delete the pending request outright (rather than marking it DECLINED) so
    // the same user can send a fresh follow request again later.
    followRepository
      .findByFollowerAndFollowee(follower, followee)
      .filter(f -> f.getStatus() == Follow.FollowStatus.PENDING)
      .ifPresent(followRepository::delete);

    // Remove the follow-request notification from the recipient's activity.
    notificationRepository.deleteByRecipientAndActorAndType(
      followee,
      follower,
      Notification.NotificationType.FOLLOW_REQUEST
    );
  }

  /**
   * Get the follow status from viewer toward target ("ACCEPTED", "PENDING",
   * "BLOCKED", or "NONE"). Returns null when viewer == target.
   */
  @Transactional(readOnly = true)
  public String getFollowStatus(UUID viewerId, UUID targetId) {
    if (viewerId == null || viewerId.equals(targetId)) return null;

    AppUser viewer = userRepository.findById(viewerId).orElse(null);
    AppUser target = userRepository.findById(targetId).orElse(null);
    if (viewer == null || target == null) return "NONE";

    Optional<Follow> follow = followRepository.findByFollowerAndFollowee(
      viewer,
      target
    );
    if (follow.isPresent()) return follow.get().getStatus().name();

    // Check if the viewer is blocked by the target
    Optional<Follow> reverseBlock = followRepository.findByFollowerAndFollowee(
      target,
      viewer
    );
    if (
      reverseBlock.isPresent() &&
      reverseBlock.get().getStatus() == Follow.FollowStatus.BLOCKED
    ) {
      return "BLOCKED";
    }

    return "NONE";
  }

  /**
   * Block a user. Removes any existing follow in both directions first, then
   * upserts a BLOCKED row from blocker → target.
   */
  @Transactional
  public void blockUser(UUID blockerId, UUID targetId) {
    if (blockerId.equals(targetId)) throw new RuntimeException(
      "Cannot block yourself"
    );

    AppUser blocker = userRepository
      .findById(blockerId)
      .orElseThrow(() -> new RuntimeException("User not found"));
    AppUser target = userRepository
      .findById(targetId)
      .orElseThrow(() -> new RuntimeException("Target user not found"));

    // Remove follow from blocker → target (any status)
    followRepository
      .findByFollowerAndFollowee(blocker, target)
      .ifPresent(followRepository::delete);
    // Remove follow from target → blocker (any status)
    followRepository
      .findByFollowerAndFollowee(target, blocker)
      .ifPresent(followRepository::delete);

    followRepository.flush();

    Follow block = Follow.builder()
      .follower(blocker)
      .followee(target)
      .status(Follow.FollowStatus.BLOCKED)
      .createdAt(LocalDateTime.now())
      .build();
    followRepository.save(block);
  }

  /**
   * Unblock a user. Deletes the BLOCKED row from blocker → target.
   */
  @Transactional
  public void unblockUser(UUID blockerId, UUID targetId) {
    AppUser blocker = userRepository
      .findById(blockerId)
      .orElseThrow(() -> new RuntimeException("User not found"));
    AppUser target = userRepository
      .findById(targetId)
      .orElseThrow(() -> new RuntimeException("Target user not found"));

    Follow block = followRepository
      .findByFollowerAndFollowee(blocker, target)
      .filter(f -> f.getStatus() == Follow.FollowStatus.BLOCKED)
      .orElseThrow(() -> new RuntimeException("No block found"));

    followRepository.delete(block);
  }

  /**
   * Returns the list of users blocked by the given user.
   */
  @Transactional(readOnly = true)
  public List<AppUser> getBlockedUsers(UUID blockerId) {
    AppUser blocker = userRepository
      .findById(blockerId)
      .orElseThrow(() -> new RuntimeException("User not found"));
    return followRepository
      .findByFollowerAndStatus(blocker, Follow.FollowStatus.BLOCKED)
      .stream()
      .map(Follow::getFollowee)
      .collect(Collectors.toList());
  }

  /**
   * Check if a block exists in either direction between two users.
   */
  public boolean isBlocked(UUID userA, UUID userB) {
    return followRepository.existsBlockBetween(userA, userB);
  }

  /**
   * Get recent follow activity for a user
   */
  @Transactional(readOnly = true)
  public List<FollowActivityDTO> getFollowActivity(UUID userId) {
    AppUser user = userRepository
      .findById(userId)
      .orElseThrow(() -> new RuntimeException("User not found"));

    return followRepository
      .findByFolloweeAndStatus(user, Follow.FollowStatus.ACCEPTED)
      .stream()
      .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
      .map(f ->
        new FollowActivityDTO(
          f.getFollower().getUserId(),
          f.getFollower().getUsername(),
          f.getFollower().getProfilePictureUrl(),
          f.getCreatedAt()
        )
      )
      .collect(Collectors.toList());
  }
}
