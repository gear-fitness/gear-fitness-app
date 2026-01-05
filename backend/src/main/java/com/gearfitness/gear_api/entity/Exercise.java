package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "exercise")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "exercise_id")
    private UUID exerciseId;

    @Column(nullable = false, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "body_part", nullable = false)
    private BodyPart bodyPart;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url")
    private String imageUrl;

    // Relationships
    @OneToMany(mappedBy = "exercise", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    @Builder.Default
    private Set<WorkoutExercise> workoutExercises = new HashSet<>();

    public enum BodyPart {
    CHEST,
    BACK,
    SHOULDERS,
    BICEPS,
    TRICEPS,
    LEGS,
    QUADS,
    HAMSTRINGS,
    GLUTES,
    CALVES,
    CORE,
    TRAPS,      
    FOREARMS,   
    FULL_BODY,
    OTHER
}
}
