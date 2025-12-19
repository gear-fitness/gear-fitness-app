package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.ExerciseDTO;
import com.gearfitness.gear_api.entity.Exercise;
import lombok.RequiredArgsConstructor;
import com.gearfitness.gear_api.repository.ExerciseRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
public class ExerciseController {

    private final ExerciseRepository exerciseRepo;


@GetMapping
public List<ExerciseDTO> getAllExercises() {
    return exerciseRepo.findAll().stream()
        .map(ex -> new ExerciseDTO(
            ex.getExerciseId(),
            ex.getName(),
            ex.getBodyPart(),     
            ex.getDescription()
        ))
        .toList();
}


@GetMapping("/filter")
public List<ExerciseDTO> getByBodyPart(@RequestParam Exercise.BodyPart bodyPart) {
    return exerciseRepo.findByBodyPart(bodyPart).stream()
            .map(ex -> new ExerciseDTO(
                    ex.getExerciseId(),
                    ex.getName(),
                    ex.getBodyPart(),
                    ex.getDescription()
            ))
            .toList();
}

}
    

