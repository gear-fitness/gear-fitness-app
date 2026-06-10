package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.BodyPartDTO;
import com.gearfitness.gear_api.dto.ExerciseDTO;
import com.gearfitness.gear_api.entity.Exercise;
import com.gearfitness.gear_api.repository.ExerciseRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Unauthenticated, read-only access to the GLOBAL exercise catalog (exercises
 * with no owning user). Used during onboarding, before the user has an account,
 * so the routine builder can reference real exercises. Never exposes
 * user-created/custom exercises. Lives under the already-public "/api/public"
 * prefix; create/update/delete remain authenticated under "/api/exercises".
 */
@RestController
@RequestMapping("/api/public/exercises")
@RequiredArgsConstructor
public class PublicExerciseController {

  private final ExerciseRepository exerciseRepo;

  @GetMapping
  public List<ExerciseDTO> getGlobalCatalog() {
    return exerciseRepo.findByUserIsNull().stream().map(this::toDTO).toList();
  }

  private ExerciseDTO toDTO(Exercise ex) {
    List<BodyPartDTO> bodyPartDTOs = ex
      .getBodyParts()
      .stream()
      .map(bp -> new BodyPartDTO(bp.getBodyPart(), bp.getTargetType()))
      .toList();

    return new ExerciseDTO(
      ex.getExerciseId(),
      ex.getName(),
      bodyPartDTOs,
      ex.getDescription()
    );
  }
}
