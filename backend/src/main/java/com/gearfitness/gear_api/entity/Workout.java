package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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
    // CHANGED: fetch = FetchType.EAGER to load exercises when workout is loaded
    // CHANGED: Using List instead of Set to maintain order
    @OneToMany(mappedBy = "workout", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("position ASC")
    @Builder.Default
    private List<WorkoutExercise> workoutExercises = new ArrayList<>();

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
