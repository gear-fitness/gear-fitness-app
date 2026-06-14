package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.repository.AppUserRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class StreakRestoreNotificationScheduler {

  private final AppUserRepository appUserRepository;
  private final StreakService streakService;
  private final ExpoPushService expoPushService;

  // Runs at :05 past every hour (UTC). Each user is notified only during the
  // hour that is just after midnight in THEIR local zone, so the "don't lose
  // your streak" push lands at ~00:05 local instead of a single global UTC
  // instant (which fired at, e.g., 5:05 PM for UTC-7 users).
  @Scheduled(cron = "0 5 * * * *", zone = "UTC")
  public void notifyRestoreEligibleUsers() {
    log.info("Running streak restore notification scheduler");
    int notified = 0;
    // The query already restricts to token-holders whose local hour is 0, so we
    // only load that small slice rather than every user, 24x/day.
    for (AppUser user : appUserRepository.findPushNotifiableAtLocalMidnight()) {
      try {
        ZoneId zone = resolveZone(user.getTimeZone());
        ZonedDateTime localNow = ZonedDateTime.now(zone);
        // Re-confirm the post-midnight hour in the JVM as a guard against any
        // zone-data drift between Postgres and Java, so each eligible user is
        // still notified exactly once per day.
        if (localNow.getHour() != 0) {
          continue;
        }

        LocalDate localToday = localNow.toLocalDate();
        if (!streakService.isRestoreAvailable(user, localToday)) {
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
    log.info("Streak restore scheduler finished: notified {} users", notified);
  }

  // Falls back to UTC for users with no stored zone or an unrecognized id, so a
  // bad value never aborts the run for everyone else.
  private ZoneId resolveZone(String timeZone) {
    if (timeZone == null || timeZone.isBlank()) {
      return ZoneOffset.UTC;
    }
    try {
      return ZoneId.of(timeZone);
    } catch (Exception e) {
      log.warn("Invalid time zone '{}', falling back to UTC", timeZone);
      return ZoneOffset.UTC;
    }
  }
}
