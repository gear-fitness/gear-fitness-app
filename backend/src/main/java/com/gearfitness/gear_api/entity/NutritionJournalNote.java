package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One user's journal note for one day: the calorie tracker's shared per-day
 * note (line text, order, and each line's linkage to its logged
 * food_log_entry rows). The content schema is owned by the client
 * (FoodJournal's Entry[]); the server treats it as an opaque JSON blob and
 * only enforces well-formedness and a size cap. Last-write-wins per date.
 */
@Entity
@Table(name = "nutrition_journal_note")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionJournalNote {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "note_id")
  private UUID noteId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private AppUser user;

  @Column(name = "log_date", nullable = false)
  private LocalDate logDate;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "content", nullable = false)
  private String content;

  // Set by the service on every upsert (no @UpdateTimestamp anywhere in this
  // codebase); doubles as the client's sync point for last-write-wins.
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;
}
