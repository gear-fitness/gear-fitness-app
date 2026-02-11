package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

import org.checkerframework.checker.units.qual.C;

@Entity
@Table(name = "routine_exercise")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoutineExercise {
    
    @Id@GeneratedValue(strategy = GenerationType.UUID)
    @Column (name = "routine_exercise_id")
    private UUID routineExerciseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "routine_id", nullable = false)
    private Routine routine;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(nullable = false)
    private Integer position;
}