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
@Table(name = "rest_day")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestDay {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "rest_day_id")
  private UUID restDayId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private AppUser user;

  @Column(nullable = false)
  private LocalDate date;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
}
