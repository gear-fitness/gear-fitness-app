package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.NotificationDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Notification;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.NotificationRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

  private final NotificationRepository notificationRepository;
  private final AppUserRepository appUserRepository;

  @Transactional(readOnly = true)
  public List<NotificationDTO> getNotificationsForUser(UUID userId) {
    return notificationRepository
      .findByRecipient_UserIdOrderByCreatedAtDesc(userId)
      .stream()
      .map(n ->
        NotificationDTO.builder()
          .notificationId(n.getNotificationId())
          .type(n.getType().name())
          .actorUsername(n.getActor().getUsername())
          .actorProfilePictureUrl(n.getActor().getProfilePictureUrl())
          .postId(n.getPost() != null ? n.getPost().getPostId() : null)
          .workoutId(
            n.getPost() != null ? n.getPost().getWorkout().getWorkoutId() : null
          )
          .commentBody(n.getComment() != null ? n.getComment().getBody() : null)
          .createdAt(n.getCreatedAt())
          .isRead(n.isRead())
          .build()
      )
      .toList();
  }

  public long getUnreadCount(UUID userId) {
    return notificationRepository.countByRecipient_UserIdAndIsReadFalse(userId);
  }

  @Transactional
  public void markAllAsRead(UUID userId) {
    List<Notification> notifications =
      notificationRepository.findByRecipient_UserIdOrderByCreatedAtDesc(userId);

    notifications.forEach(n -> n.setRead(true));

    notificationRepository.saveAll(notifications);
  }

  @Transactional
  public void registerPushToken(UUID userId, String pushToken) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new RuntimeException("User not found"));
    user.setExpoPushToken(pushToken);
    appUserRepository.save(user);
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
