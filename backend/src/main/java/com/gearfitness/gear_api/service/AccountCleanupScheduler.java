package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.repository.AppUserRepository;
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
  private final AccountPurger accountPurger;

  // Runs hourly. Each pass hard-deletes any accounts past the 48h window.
  // Deliberately NOT @Transactional: the loop must not share a transaction with
  // the per-user purge, so one user's failure can't roll back the whole batch.
  @Scheduled(cron = "0 0 * * * *")
  public void purgeExpiredSoftDeletes() {
    LocalDateTime cutoff = LocalDateTime.now().minusHours(
      RECOVERY_WINDOW_HOURS
    );
    // Only soft-deleted (deleted_at IS NOT NULL) accounts past the window are
    // returned; active users can never be selected.
    List<AppUser> expired = userRepository.findSoftDeletedBefore(cutoff);

    int purged = 0;
    for (AppUser user : expired) {
      UUID userId = user.getUserId();
      try {
        // 1) Delete all DB rows in this user's own transaction. If anything
        //    fails (e.g. an unexpected FK), it rolls back this user only and we
        //    move on — the account simply purges on a later run.
        accountPurger.purgeUserData(userId);

        // 2) Only AFTER the DB delete has committed do we remove the S3 object.
        //    Doing it post-commit means a rolled-back purge never strips a
        //    surviving account's picture. A failure here is logged and leaves an
        //    orphaned object (storage cost only), never DB inconsistency.
        try {
          s3StorageService.deleteProfilePicture(userId);
        } catch (Exception e) {
          System.err.println(
            "S3 cleanup failed for " + userId + ": " + e.getMessage()
          );
        }

        purged++;
      } catch (Exception e) {
        System.err.println(
          "Account purge failed for " +
            userId +
            ", will retry next run: " +
            e.getMessage()
        );
      }
    }

    if (purged > 0) {
      System.out.println("Purged " + purged + " expired account(s)");
    }
  }
}
