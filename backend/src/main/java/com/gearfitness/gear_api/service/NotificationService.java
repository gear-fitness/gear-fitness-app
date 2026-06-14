package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.NotificationDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Notification;
import com.gearfitness.gear_api.entity.Post;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.NotificationRepository;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class NotificationService {

  private final NotificationRepository notificationRepository;
  private final AppUserRepository appUserRepository;

  @Transactional(readOnly = true)
  public List<NotificationDTO> getNotificationsForUser(UUID userId) {
    return notificationRepository
      .findVisibleByRecipient(userId)
      .stream()
      .map(n ->
        NotificationDTO.builder()
          .notificationId(n.getNotificationId())
          .type(n.getType().name())
          .actorUserId(n.getActor().getUserId())
          .actorUsername(n.getActor().getUsername())
          .actorProfilePictureUrl(n.getActor().getProfilePictureUrl())
          .postId(n.getPost() != null ? n.getPost().getPostId() : null)
          .workoutId(
            n.getPost() != null ? n.getPost().getWorkout().getWorkoutId() : null
          )
          .postImageUrl(resolvePostThumbnail(n.getPost()))
          .commentBody(n.getComment() != null ? n.getComment().getBody() : null)
          .createdAt(n.getCreatedAt())
          .isRead(n.isRead())
          .build()
      )
      .toList();
  }

  /**
   * Resolve a single thumbnail S3 key for a post, preferring the legacy
   * single image and falling back to the first workout photo. Returns null
   * when the post has no associated image.
   */
  private String resolvePostThumbnail(Post post) {
    if (post == null) {
      return null;
    }
    if (post.getImageUrl() != null && !post.getImageUrl().isBlank()) {
      return post.getImageUrl();
    }
    if (
      post.getWorkout() != null &&
      post.getWorkout().getPhotoUrls() != null &&
      !post.getWorkout().getPhotoUrls().isEmpty()
    ) {
      return post.getWorkout().getPhotoUrls().get(0);
    }
    return null;
  }

  public long getUnreadCount(UUID userId) {
    return notificationRepository.countUnreadVisibleByRecipient(userId);
  }

  @Transactional
  public void deleteNotification(UUID userId, UUID notificationId) {
    Notification notification = notificationRepository
      .findById(notificationId)
      .orElseThrow(
        () ->
          new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "Notification not found"
          )
      );

    // Only the recipient may delete their own activity row. This removes the
    // notification record only — the underlying like/comment/follow is untouched.
    if (!notification.getRecipient().getUserId().equals(userId)) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "Not authorized to delete this notification"
      );
    }

    notificationRepository.delete(notification);
  }

  @Transactional
  public void markAllAsRead(UUID userId) {
    // Only touch notifications the user can actually see; a blocked actor's
    // notifications stay untouched so they re-surface (still unread) on unblock.
    List<Notification> notifications =
      notificationRepository.findVisibleByRecipient(userId);

    notifications.forEach(n -> n.setRead(true));

    notificationRepository.saveAll(notifications);
  }

  @Transactional
  public void registerPushToken(UUID userId, String pushToken, String timeZone) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new RuntimeException("User not found"));
    user.setExpoPushToken(pushToken);
    // Only overwrite when the client reported a valid IANA zone, so a request
    // without it doesn't wipe a previously stored value and a malformed one
    // can't later break the scheduler's `AT TIME ZONE` query.
    if (timeZone != null && !timeZone.isBlank() && isValidZone(timeZone)) {
      user.setTimeZone(timeZone);
    }
    appUserRepository.save(user);
  }

  private boolean isValidZone(String timeZone) {
    try {
      ZoneId.of(timeZone);
      return true;
    } catch (DateTimeException e) {
      return false;
    }
  }

  @Transactional
  public void unregisterPushToken(UUID userId) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new RuntimeException("User not found"));
    user.setExpoPushToken(null);
    appUserRepository.save(user);
  }
}
