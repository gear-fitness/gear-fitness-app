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
 * A "What's New" popup campaign. Rows are authored directly in the database;
 * activation, audience targeting, version bounds, and the scheduling window
 * all live here so a campaign can be launched or killed without an app
 * release. features and cta_params hold JSON strings parsed by the app.
 */
@Entity
@Table(name = "announcement")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Announcement {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "announcement_id")
  private UUID announcementId;

  @Column(nullable = false)
  @Builder.Default
  private boolean active = true;

  @Column(nullable = false, length = 120)
  private String title;

  @Column(columnDefinition = "text")
  private String body;

  // SF Symbol name rendered as the popup hero.
  @Column(nullable = false, length = 64)
  @Builder.Default
  private String icon = "sparkles";

  // JSON array of { icon, title, body } rows, or null for body-only popups.
  @Column(columnDefinition = "text")
  private String features;

  @Column(name = "cta_label", nullable = false, length = 60)
  private String ctaLabel;

  // RootStack route name the primary button navigates to. The app validates
  // it against an allowlist, so an unknown route degrades to a dismiss.
  @Column(name = "cta_route", nullable = false, length = 64)
  private String ctaRoute;

  @Column(name = "cta_params", columnDefinition = "text")
  private String ctaParams;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  @Builder.Default
  private Audience audience = Audience.ALL;

  // Inclusive app-version bounds; null means unbounded on that end.
  @Column(name = "min_app_version", length = 20)
  private String minAppVersion;

  @Column(name = "max_app_version", length = 20)
  private String maxAppVersion;

  @Column(name = "starts_at")
  private LocalDateTime startsAt;

  @Column(name = "ends_at")
  private LocalDateTime endsAt;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  /**
   * Marketing audience only. Server-side tier can briefly lag RevenueCat
   * (webhook delivery), so never reuse this for entitlement gating.
   */
  public enum Audience {
    ALL,
    FREE_ONLY,
    PLUS_ONLY,
  }
}
