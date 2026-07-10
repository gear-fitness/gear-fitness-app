package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.AnnouncementEvent;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementEventRepository
  extends JpaRepository<AnnouncementEvent, UUID>
{
  boolean existsByAnnouncementAnnouncementIdAndUserUserIdAndEventType(
    UUID announcementId,
    UUID userId,
    AnnouncementEvent.EventType eventType
  );
}
