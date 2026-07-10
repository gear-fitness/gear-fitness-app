package com.gearfitness.gear_api.dto;

/**
 * Result of a barcode lookup. status is FOUND (food carries the match),
 * NOT_FOUND (nothing anywhere), or INCOMPLETE (the product exists upstream but
 * lacks usable nutrition; productName lets the client prefill a custom-food
 * form as the fallback).
 */
public record BarcodeLookupResponse(
  String status,
  FoodItemDTO food,
  String productName
) {
  public static BarcodeLookupResponse found(FoodItemDTO food) {
    return new BarcodeLookupResponse("FOUND", food, null);
  }

  public static BarcodeLookupResponse notFound() {
    return new BarcodeLookupResponse("NOT_FOUND", null, null);
  }

  public static BarcodeLookupResponse incomplete(String productName) {
    return new BarcodeLookupResponse("INCOMPLETE", null, productName);
  }
}
