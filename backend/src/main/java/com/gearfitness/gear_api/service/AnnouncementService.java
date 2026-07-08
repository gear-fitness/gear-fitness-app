package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.AnnouncementDTO;
import com.gearfitness.gear_api.entity.Announcement;
import com.gearfitness.gear_api.entity.AnnouncementEvent;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Tier;
import com.gearfitness.gear_api.repository.AnnouncementEventRepository;
import com.gearfitness.gear_api.repository.AnnouncementRepository;
import com.gearfitness.gear_api.repository.AppUserRepository;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

  private static final EnumSet<AnnouncementEvent.EventType> SEEN_TYPES =
    EnumSet.of(
      AnnouncementEvent.EventType.DISMISS,
      AnnouncementEvent.EventType.CTA
    );

  private final AnnouncementRepository announcementRepository;
  private final AnnouncementEventRepository eventRepository;
  private final AppUserRepository appUserRepository;

  /**
   * Newest active announcement the user should see on this launch, or empty.
   * Filters by scheduling window, audience (from the server-side tier), the
   * user's dismiss/CTA history, and the app version range. A missing or
   * unparseable appVersion fails open: this is a marketing popup, so showing
   * it to an odd client beats never showing it at all.
   */
  @Transactional(readOnly = true)
  public Optional<AnnouncementDTO> getPendingFor(
    UUID userId,
    String appVersion
  ) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
      );

    EnumSet<Announcement.Audience> audiences = user.getTier() == Tier.BASIC
      ? EnumSet.of(Announcement.Audience.ALL, Announcement.Audience.FREE_ONLY)
      : EnumSet.of(Announcement.Audience.ALL, Announcement.Audience.PLUS_ONLY);

    List<Announcement> candidates = announcementRepository.findPendingForUser(
      userId,
      LocalDateTime.now(),
      audiences,
      SEEN_TYPES
    );

    return candidates
      .stream()
      .filter(a ->
        versionInRange(appVersion, a.getMinAppVersion(), a.getMaxAppVersion())
      )
      .findFirst()
      .map(a ->
        new AnnouncementDTO(
          a.getAnnouncementId(),
          a.getTitle(),
          a.getBody(),
          a.getIcon(),
          a.getFeatures(),
          a.getCtaLabel(),
          a.getCtaRoute(),
          a.getCtaParams()
        )
      );
  }

  /**
   * Record an IMPRESSION / CTA / DISMISS. Idempotent per (announcement, user,
   * type): repeats are ignored, both via a pre-check and by swallowing the
   * unique-constraint violation two racing requests can produce.
   */
  @Transactional
  public void recordEvent(UUID userId, UUID announcementId, String rawType) {
    AnnouncementEvent.EventType type;
    try {
      type = AnnouncementEvent.EventType.valueOf(
        rawType == null ? "" : rawType.trim().toUpperCase()
      );
    } catch (IllegalArgumentException e) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Unknown event type"
      );
    }

    Announcement announcement = announcementRepository
      .findById(announcementId)
      .orElseThrow(() ->
        new ResponseStatusException(
          HttpStatus.NOT_FOUND,
          "Announcement not found"
        )
      );

    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
      );

    if (
      eventRepository.existsByAnnouncementAnnouncementIdAndUserUserIdAndEventType(
        announcementId,
        userId,
        type
      )
    ) {
      return;
    }

    try {
      eventRepository.save(
        AnnouncementEvent.builder()
          .announcement(announcement)
          .user(user)
          .eventType(type)
          .build()
      );
    } catch (DataIntegrityViolationException e) {
      // Lost a race with a duplicate request; the row exists, which is fine.
    }
  }

  /**
   * Inclusive segment-wise version comparison. Null bounds are unbounded;
   * null or unparseable versions match everything (fail open). "1.0" and
   * "1.0.0" compare equal; non-numeric suffixes like "-beta" are stripped.
   */
  static boolean versionInRange(String version, String min, String max) {
    if (version == null || version.isBlank()) {
      return true;
    }
    if (min != null && !min.isBlank() && compareVersions(version, min) < 0) {
      return false;
    }
    if (max != null && !max.isBlank() && compareVersions(version, max) > 0) {
      return false;
    }
    return true;
  }

  private static int compareVersions(String a, String b) {
    String[] as = a.split("\\.");
    String[] bs = b.split("\\.");
    int len = Math.max(as.length, bs.length);
    for (int i = 0; i < len; i++) {
      int ai = i < as.length ? numericPrefix(as[i]) : 0;
      int bi = i < bs.length ? numericPrefix(bs[i]) : 0;
      if (ai != bi) {
        return Integer.compare(ai, bi);
      }
    }
    return 0;
  }

  private static int numericPrefix(String segment) {
    int end = 0;
    while (end < segment.length() && Character.isDigit(segment.charAt(end))) {
      end++;
    }
    if (end == 0) {
      return 0;
    }
    try {
      return Integer.parseInt(segment.substring(0, end));
    } catch (NumberFormatException e) {
      return 0;
    }
  }
}
