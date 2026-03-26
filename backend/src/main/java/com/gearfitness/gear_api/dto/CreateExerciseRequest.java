package com.gearfitness.gear_api.dto;

public record CreateExerciseRequest(
  String name,
  String description,
  String bodyPart
) {}
