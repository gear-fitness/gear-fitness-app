package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
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
@Table(name = "report")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report {

  public enum Reason {
    NUDITY,
    SPAM,
    HARASSMENT,
    VIOLENCE,
    OTHER,
  }

  public enum ReportStatus {
    PENDING,
    ACTIONED,
    DISMISSED,
  }

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "report_id")
  private UUID reportId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "post_id", nullable = false)
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Post post;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "reporter_id", nullable = false)
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private AppUser reporter;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private Reason reason;

  @Column(columnDefinition = "TEXT")
  private String note;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  @Builder.Default
  private ReportStatus status = ReportStatus.PENDING;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
}
