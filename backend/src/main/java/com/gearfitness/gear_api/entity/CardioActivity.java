package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "cardio_activity")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CardioActivity {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "cardio_activity_id")
  private UUID cardioActivityId;

  @Column(nullable = false)
  private String name;

  @Column(columnDefinition = "TEXT")
  private String description;
}
