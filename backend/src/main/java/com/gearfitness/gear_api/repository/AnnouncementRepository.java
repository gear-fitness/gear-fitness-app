package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Announcement;
import com.gearfitness.gear_api.entity.AnnouncementEvent;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnnouncementRepository
  extends JpaRepository<Announcement, UUID> {
  /**
   * Active announcements inside their scheduling window that match one of the
   * given audiences and that the user has not already dismissed or acted on
   * (an IMPRESSION alone does not count as seen, so a force-quit mid-popup
   * shows it again). Newest first; version-range filtering happens in the
   * service since semver comparison does not belong in SQL.
   */
  @Query(
    """
    SELECT a FROM Announcement a
    WHERE a.active = true
    AND (a.startsAt IS NULL OR a.startsAt <= :now)
    AND (a.endsAt IS NULL OR a.endsAt > :now)
    AND a.audience IN :audiences
    AND NOT EXISTS (
        SELECT e FROM AnnouncementEvent e
        WHERE e.announcement = a
        AND e.user.userId = :userId
        AND e.eventType IN :seenTypes
    )
    ORDER BY a.createdAt DESC
    """
  )
  List<Announcement> findPendingForUser(
    @Param("userId") UUID userId,
    @Param("now") LocalDateTime now,
    @Param("audiences") Collection<Announcement.Audience> audiences,
    @Param("seenTypes") Collection<AnnouncementEvent.EventType> seenTypes
  );
}
