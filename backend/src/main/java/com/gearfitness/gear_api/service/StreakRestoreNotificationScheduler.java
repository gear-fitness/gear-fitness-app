package com.gearfitness.gear_api.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.repository.AppUserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class StreakRestoreNotificationScheduler {

  private final AppUserRepository appUserRepository;
  private final StreakService streakService;
  private final ExpoPushService expoPushService;

  @Scheduled(cron = "0 5 0 * * *", zone = "UTC")
  public void notifyRestoreEligibleUsers() {
    log.info("Running streak restore notification scheduler");
    int notified = 0;
    for (AppUser user : appUserRepository.findAll()) {
      try {
        if (user.getExpoPushToken() == null) {
          continue;
        }
        if (!streakService.isRestoreAvailable(user)) {
          continue;
        }

        String data =
          "{\"type\":\"RESTORE_ELIGIBLE\",\"screen\":\"Home\",\"params\":{\"openStreakDropdown\":true}}";
        expoPushService.sendPushNotification(
          user.getExpoPushToken(),
          "Don't lose your streak! \uD83D\uDD25",
          "You have 1 restore token. Tap to get your streak back.",
          data
        );
        notified++;
      } catch (Exception e) {
        log.error(
          "Failed to process restore notification for user {}",
          user.getUserId(),
          e
        );
      }
    }
    log.info(
      "Streak restore scheduler finished: notified {} users",
      notified
    );
  }
}
