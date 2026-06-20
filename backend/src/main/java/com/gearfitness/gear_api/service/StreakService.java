package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.StreakInfoDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.RestDay;
import com.gearfitness.gear_api.entity.StreakRestore;
import com.gearfitness.gear_api.entity.Tier;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.RestDayRepository;
import com.gearfitness.gear_api.repository.StreakRestoreRepository;
import com.gearfitness.gear_api.repository.WorkoutRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StreakService {

  private final AppUserRepository appUserRepository;
  private final WorkoutRepository workoutRepository;
  private final RestDayRepository restDayRepository;
  private final StreakRestoreRepository streakRestoreRepository;

  @Transactional(readOnly = true)
  public StreakInfoDTO getStreakInfo(UUID userId, LocalDate today) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() ->
        new RuntimeException("User not found with id: " + userId)
      );

    refreshStreakIfStale(user, today);

    return StreakInfoDTO.builder()
      .currentStreak(user.getCurrentStreak())
      .longestStreak(user.getLongestStreak())
      .restoreTokensRemaining(getRestoreTokensRemaining(user, today))
      .todayLogged(isTodayLogged(user, today))
      .lastStreakDate(user.getLastStreakDate())
      .build();
  }

  @Transactional
  public StreakInfoDTO logRestDay(UUID userId, LocalDate today) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() ->
        new RuntimeException("User not found with id: " + userId)
      );

    if (workoutRepository.existsByUserAndDatePerformed(user, today)) {
      throw new IllegalStateException("Already worked out today");
    }

    if (restDayRepository.existsByUserAndDate(user, today)) {
      throw new IllegalStateException("Rest day already logged for today");
    }

    RestDay restDay = RestDay.builder().user(user).date(today).build();
    try {
      // Flush now so a concurrent duplicate trips the (user, date) unique
      // constraint here — where we can translate it to a friendly 400 — rather
      // than at commit time, which would surface as an unhandled 500.
      restDayRepository.saveAndFlush(restDay);
    } catch (DataIntegrityViolationException e) {
      throw new IllegalStateException("Rest day already logged for today");
    }

    recalculateStreak(user, today);

    return StreakInfoDTO.builder()
      .currentStreak(user.getCurrentStreak())
      .longestStreak(user.getLongestStreak())
      .restoreTokensRemaining(getRestoreTokensRemaining(user, today))
      .todayLogged(true)
      .lastStreakDate(user.getLastStreakDate())
      .build();
  }

  @Transactional
  public StreakInfoDTO useRestoreToken(UUID userId, LocalDate today) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() ->
        new RuntimeException("User not found with id: " + userId)
      );

    if (getRestoreTokensRemaining(user, today) <= 0) {
      throw new IllegalStateException("No restore tokens available");
    }

    LocalDate yesterday = today.minusDays(1);
    LocalDate dayBeforeYesterday = today.minusDays(2);

    Set<LocalDate> window = getActiveDays(user, dayBeforeYesterday, yesterday);
    if (window.contains(yesterday)) {
      throw new IllegalStateException("Streak is not broken");
    }
    if (!window.contains(dayBeforeYesterday)) {
      throw new IllegalStateException("No active streak to restore");
    }

    StreakRestore restore = StreakRestore.builder()
      .user(user)
      .usedAt(LocalDateTime.now(ZoneOffset.UTC))
      .restoredDate(yesterday)
      .build();
    streakRestoreRepository.save(restore);

    recalculateStreak(user, today);

    return StreakInfoDTO.builder()
      .currentStreak(user.getCurrentStreak())
      .longestStreak(user.getLongestStreak())
      .restoreTokensRemaining(getRestoreTokensRemaining(user, today))
      .todayLogged(isTodayLogged(user, today))
      .lastStreakDate(user.getLastStreakDate())
      .build();
  }

  @Transactional
  public void recalculateStreak(AppUser user, LocalDate today) {
    int maxLookback = Math.max(user.getCurrentStreak() + 30, 365);
    LocalDate lookbackStart = today.minusDays(maxLookback);

    Set<LocalDate> activeDays = getActiveDays(user, lookbackStart, today);

    // Allow the chain to start at yesterday when today isn't logged yet —
    // today only counts as a break once the user's local day has actually ended.
    LocalDate mostRecentActiveDay = activeDays.contains(today)
      ? today
      : today.minusDays(1);
    LocalDate date = mostRecentActiveDay;
    int streak = 0;
    while (activeDays.contains(date)) {
      streak++;
      date = date.minusDays(1);
    }

    user.setCurrentStreak(streak);
    // Anchor lastStreakDate to the chain's most recent active day, NOT the
    // passed `today`. When today isn't logged yet, `today` has no activity, so
    // pinning the anchor there would misrepresent the last active day and let
    // refreshStreakIfStale treat an already-broken streak as fresh. The most
    // recent active day (today if logged, else yesterday) is the correct anchor.
    // (A back-dated submit still anchors within its own past window; that is
    // self-corrected on the next read, which recomputes against the real today.)
    user.setLastStreakDate(streak > 0 ? mostRecentActiveDay : null);
    if (streak > user.getLongestStreak()) {
      user.setLongestStreak(streak);
    }
    appUserRepository.save(user);
  }

  public void recalculateStreak(UUID userId, LocalDate today) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() ->
        new RuntimeException("User not found with id: " + userId)
      );
    recalculateStreak(user, today);
  }

  private Set<LocalDate> getActiveDays(
    AppUser user,
    LocalDate start,
    LocalDate end
  ) {
    List<LocalDate> workoutDates =
      workoutRepository.findDistinctDatesByUserAndDateBetween(user, start, end);
    List<LocalDate> restDayDates =
      restDayRepository.findDatesByUserAndDateBetween(user, start, end);
    List<LocalDate> restoredDates =
      streakRestoreRepository.findRestoredDatesByUserAndDateBetween(
        user,
        start,
        end
      );

    Set<LocalDate> activeDays = new HashSet<>();
    activeDays.addAll(workoutDates);
    activeDays.addAll(restDayDates);
    activeDays.addAll(restoredDates);
    return activeDays;
  }

  @Transactional(readOnly = true)
  public boolean isRestoreAvailable(AppUser user, LocalDate today) {
    if (getRestoreTokensRemaining(user, today) <= 0) {
      return false;
    }
    LocalDate yesterday = today.minusDays(1);
    LocalDate dayBeforeYesterday = today.minusDays(2);
    Set<LocalDate> window = getActiveDays(user, dayBeforeYesterday, yesterday);
    return !window.contains(yesterday) && window.contains(dayBeforeYesterday);
  }

  private int getRestoreTokensRemaining(AppUser user, LocalDate today) {
    // Streak restores are a Plus+ benefit. Basic users get none.
    if (!user.getTier().atLeast(Tier.PLUS)) {
      return 0;
    }

    // Plus gets 4 tokens per calendar month.
    LocalDate firstOfMonth = today.withDayOfMonth(1);
    LocalDate lastOfMonth = today.withDayOfMonth(today.lengthOfMonth());

    long usedThisMonth = streakRestoreRepository.countByUserAndUsedAtBetween(
      user,
      firstOfMonth.atStartOfDay(),
      lastOfMonth.atTime(LocalTime.MAX)
    );

    return Math.max(0, 4 - (int) usedThisMonth);
  }

  private boolean isTodayLogged(AppUser user, LocalDate today) {
    return (
      workoutRepository.existsByUserAndDatePerformed(user, today) ||
      restDayRepository.existsByUserAndDate(user, today)
    );
  }

  /**
   * Recompute the streak if it may have broken since it was last touched.
   * Public so read paths that surface the streak (profile stats, dropdown) can
   * correct a stale persisted value before returning it.
   */
  public void refreshStreakIfStale(AppUser user, LocalDate today) {
    LocalDate lastDate = user.getLastStreakDate();
    if (lastDate == null) {
      return;
    }

    LocalDate yesterday = today.minusDays(1);

    // If last streak date is before yesterday, streak may have broken
    if (lastDate.isBefore(yesterday)) {
      recalculateStreak(user, today);
    }
  }
}
