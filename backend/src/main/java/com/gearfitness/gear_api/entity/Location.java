package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

/**
 * A gym (or other training spot) a workout can be tagged with. Rows are
 * shared across users: Places-sourced rows are deduped by googlePlaceId,
 * manual entries (null place id) by case-insensitive name. Coordinates are
 * the venue's public position, never a user's GPS fix.
 */
@Entity
@Table(name = "location")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Location {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "location_id")
  private UUID locationId;

  @Column(nullable = false)
  private String name;

  private String address;

  @Column(precision = 10, scale = 7)
  private BigDecimal latitude;

  @Column(precision = 10, scale = 7)
  private BigDecimal longitude;

  @Column(name = "google_place_id")
  private String googlePlaceId;

  // Attribution only — plain UUID, no relation; the DB FK is ON DELETE SET
  // NULL so shared gyms survive their creator's account deletion.
  @Column(name = "created_by")
  private UUID createdBy;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
}
