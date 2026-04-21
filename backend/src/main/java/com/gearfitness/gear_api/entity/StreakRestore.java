package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "streak_restore")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StreakRestore {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "streak_restore_id")
  private UUID streakRestoreId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private AppUser user;

  @Column(name = "used_at", nullable = false)
  private LocalDateTime usedAt;

  @Column(name = "restored_date", nullable = false)
  private LocalDate restoredDate;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
}
