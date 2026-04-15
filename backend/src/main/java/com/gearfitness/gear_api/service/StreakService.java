package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.StreakInfoDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.RestDay;
import com.gearfitness.gear_api.entity.StreakRestore;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.RestDayRepository;
import com.gearfitness.gear_api.repository.StreakRestoreRepository;
import com.gearfitness.gear_api.repository.WorkoutRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
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
  public StreakInfoDTO getStreakInfo(UUID userId) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() ->
        new RuntimeException("User not found with id: " + userId)
      );

    refreshStreakIfStale(user);

    return StreakInfoDTO.builder()
      .currentStreak(user.getCurrentStreak())
      .longestStreak(user.getLongestStreak())
      .restoreTokensRemaining(getRestoreTokensRemaining(user))
      .todayLogged(isTodayLogged(user))
      .lastStreakDate(user.getLastStreakDate())
      .build();
  }

  @Transactional
  public StreakInfoDTO logRestDay(UUID userId) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() ->
        new RuntimeException("User not found with id: " + userId)
      );

    LocalDate today = LocalDate.now(ZoneOffset.UTC);

    if (workoutRepository.existsByUserAndDatePerformed(user, today)) {
      throw new IllegalStateException("Already worked out today");
    }

    if (restDayRepository.existsByUserAndDate(user, today)) {
      throw new IllegalStateException("Rest day already logged for today");
    }

    RestDay restDay = RestDay.builder().user(user).date(today).build();
    restDayRepository.save(restDay);

    recalculateStreak(user);

    return StreakInfoDTO.builder()
      .currentStreak(user.getCurrentStreak())
      .longestStreak(user.getLongestStreak())
      .restoreTokensRemaining(getRestoreTokensRemaining(user))
      .todayLogged(true)
      .lastStreakDate(user.getLastStreakDate())
      .build();
  }

  @Transactional
  public StreakInfoDTO useRestoreToken(UUID userId) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() ->
        new RuntimeException("User not found with id: " + userId)
      );

    if (getRestoreTokensRemaining(user) <= 0) {
      throw new IllegalStateException(
        "No restore tokens available this week"
      );
    }

    LocalDate today = LocalDate.now(ZoneOffset.UTC);
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

    recalculateStreak(user);

    return StreakInfoDTO.builder()
      .currentStreak(user.getCurrentStreak())
      .longestStreak(user.getLongestStreak())
      .restoreTokensRemaining(getRestoreTokensRemaining(user))
      .todayLogged(isTodayLogged(user))
      .lastStreakDate(user.getLastStreakDate())
      .build();
  }

  @Transactional
  public void recalculateStreak(AppUser user) {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    int maxLookback = Math.max(user.getCurrentStreak() + 30, 365);
    LocalDate lookbackStart = today.minusDays(maxLookback);

    Set<LocalDate> activeDays = getActiveDays(user, lookbackStart, today);

    // Allow the chain to start at yesterday when today isn't logged yet —
    // today only counts as a break once the UTC day has actually ended.
    LocalDate date = activeDays.contains(today) ? today : today.minusDays(1);
    int streak = 0;
    while (activeDays.contains(date)) {
      streak++;
      date = date.minusDays(1);
    }

    user.setCurrentStreak(streak);
    user.setLastStreakDate(streak > 0 ? today : null);
    if (streak > user.getLongestStreak()) {
      user.setLongestStreak(streak);
    }
    appUserRepository.save(user);
  }

  public void recalculateStreak(UUID userId) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() ->
        new RuntimeException("User not found with id: " + userId)
      );
    recalculateStreak(user);
  }

  private Set<LocalDate> getActiveDays(
    AppUser user,
    LocalDate start,
    LocalDate end
  ) {
    List<LocalDate> workoutDates =
      workoutRepository.findDistinctDatesByUserAndDateBetween(
        user,
        start,
        end
      );
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
  public boolean isRestoreAvailable(AppUser user) {
    if (getRestoreTokensRemaining(user) <= 0) {
      return false;
    }
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    LocalDate yesterday = today.minusDays(1);
    LocalDate dayBeforeYesterday = today.minusDays(2);
    Set<LocalDate> window = getActiveDays(user, dayBeforeYesterday, yesterday);
    return !window.contains(yesterday) && window.contains(dayBeforeYesterday);
  }

  private int getRestoreTokensRemaining(AppUser user) {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    LocalDate monday = today.with(
      TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)
    );
    LocalDate sunday = monday.plusDays(6);

    long usedThisWeek = streakRestoreRepository.countByUserAndUsedAtBetween(
      user,
      monday.atStartOfDay(),
      sunday.atTime(LocalTime.MAX)
    );

    return Math.max(0, 1 - (int) usedThisWeek);
  }

  private boolean isTodayLogged(AppUser user) {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    return (
      workoutRepository.existsByUserAndDatePerformed(user, today) ||
      restDayRepository.existsByUserAndDate(user, today)
    );
  }

  private void refreshStreakIfStale(AppUser user) {
    LocalDate lastDate = user.getLastStreakDate();
    if (lastDate == null) {
      return;
    }

    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    LocalDate yesterday = today.minusDays(1);

    // If last streak date is before yesterday, streak may have broken
    if (lastDate.isBefore(yesterday)) {
      recalculateStreak(user);
    }
  }
}
