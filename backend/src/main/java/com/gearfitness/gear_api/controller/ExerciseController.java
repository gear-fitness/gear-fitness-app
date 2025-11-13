package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.entity.Exercise;
import com.gearfitness.gear_api.repository.ExerciseRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/exercises")
@CrossOrigin(origins = "*") 
public class ExerciseController {

    private final ExerciseRepository exerciseRepo;

    public ExerciseController(ExerciseRepository exerciseRepo) {
        this.exerciseRepo = exerciseRepo;
    }

@GetMapping
public List<Exercise> getAllExercises() {
    return exerciseRepo.findAll();
    }

@GetMapping("/filter")
public List<Exercise> getByBodyPart(@RequestParam Exercise.BodyPart bodyPart) {
    return exerciseRepo.findByBodyPart(bodyPart);
}

}
    

