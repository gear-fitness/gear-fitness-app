package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.repository.AppUserRepository;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AccountCleanupScheduler {

  private static final long RECOVERY_WINDOW_HOURS = 48;

  private final AppUserRepository userRepository;
  private final S3StorageService s3StorageService;
  private final EntityManager em;

  // Runs hourly. Each pass hard-deletes any accounts past the 48h window.
  @Scheduled(cron = "0 0 * * * *")
  @Transactional
  public void purgeExpiredSoftDeletes() {
    LocalDateTime cutoff = LocalDateTime.now().minusHours(
      RECOVERY_WINDOW_HOURS
    );
    List<AppUser> expired = userRepository.findSoftDeletedBefore(cutoff);

    for (AppUser user : expired) {
      UUID userId = user.getUserId();
      try {
        s3StorageService.deleteProfilePicture(user.getUserId());
      } catch (Exception e) {
        System.err.println(
          "S3 cleanup failed for " + user.getUserId() + ": " + e.getMessage()
        );
      }
      hardDeleteContent(userId);
      userRepository.delete(user);
    }

    if (!expired.isEmpty()) {
      System.out.println("Purged " + expired.size() + " expired account(s)");
    }
  }

  private void hardDeleteContent(UUID userId) {
    em
      .createNativeQuery("DELETE FROM post_like WHERE user_id = :uid")
      .setParameter("uid", userId)
      .executeUpdate();
    em
      .createNativeQuery("DELETE FROM post_comment WHERE user_id = :uid")
      .setParameter("uid", userId)
      .executeUpdate();
    // Reports FK post(post_id) and app_user(user_id) without ON DELETE CASCADE,
    // so clear them before deleting the user's posts (and the user row).
    em
      .createNativeQuery("DELETE FROM report WHERE reporter_id = :uid")
      .setParameter("uid", userId)
      .executeUpdate();
    em
      .createNativeQuery(
        "DELETE FROM report WHERE post_id IN (SELECT post_id FROM post WHERE user_id = :uid)"
      )
      .setParameter("uid", userId)
      .executeUpdate();
    em
      .createNativeQuery("DELETE FROM post WHERE user_id = :uid")
      .setParameter("uid", userId)
      .executeUpdate();
    em
      .createNativeQuery(
        "DELETE FROM follow WHERE follower_id = :uid OR followee_id = :uid"
      )
      .setParameter("uid", userId)
      .executeUpdate();
  }
}
