package com.gearfitness.gear_api.dto;

import java.util.List;

/**
 * Foods the vision model recognized in a meal photo, one element per distinct
 * food with macros scaled to the visible portion. Nothing is logged by the
 * estimate call; the client confirms and logs through POST /nutrition/log.
 * noFood is true when the model saw no food or drink in the image at all.
 */
public record AiPhotoEstimateResponse(
  List<PhotoFood> foods,
  String reasoning,
  Integer confidence,
  boolean noFood
) {
  public record PhotoFood(
    String description,
    Double calories,
    Double proteinG,
    Double carbsG,
    Double fatG
  ) {}
}
