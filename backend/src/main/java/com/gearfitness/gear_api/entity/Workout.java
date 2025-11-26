package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "workout")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Workout {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "workout_id")
    private UUID workoutId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(nullable = false)
    private String name;

    @Column(name = "date_performed", nullable = false)
    private LocalDate datePerformed;

    @Column(name = "duration_min")
    private Integer durationMin;

    @Enumerated(EnumType.STRING)
    @Column(name = "body_tag")
    private BodyTag bodyTag;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Relationships
    @OneToMany(mappedBy = "workout", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    @Builder.Default
    private Set<WorkoutExercise> workoutExercises = new HashSet<>();

    @OneToOne(mappedBy = "workout", cascade = CascadeType.ALL, orphanRemoval = true)
    private Post post;

    public enum BodyTag {
        FULL_BODY,
        CHEST,
        BACK,
        SHOULDERS,
        BICEPS,
        TRICEPS,
        LEGS,
        GLUTES,
        HAMSTRINGS,
        QUADS,
        CALVES,
        CORE,
        OTHER
    }
}
