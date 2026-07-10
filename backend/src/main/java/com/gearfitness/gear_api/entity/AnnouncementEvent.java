package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Per-user announcement interaction. Unique on (announcement, user, type),
 * so repeat impressions dedupe and growth is capped at three rows per user
 * per announcement. A DISMISS or CTA row is also what marks an announcement
 * as seen server-side.
 */
@Entity
@Table(name = "announcement_event")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnnouncementEvent {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "event_id")
  private UUID eventId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "announcement_id", nullable = false)
  private Announcement announcement;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private AppUser user;

  @Enumerated(EnumType.STRING)
  @Column(name = "event_type", nullable = false, length = 20)
  private EventType eventType;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  public enum EventType {
    IMPRESSION,
    CTA,
    DISMISS,
  }
}
